import config from 'config';
import type { Application, NextFunction, Request, RequestHandler, Response } from 'express';

import { HTTPError } from '../HttpError';
import { oidcMiddleware } from '../middleware';
import { formatPence } from '../steps/make-a-claim/rentHistory';
import { startFlowConfig } from '../steps/make-a-claim/start/flow.config';
import { startStepRegistry } from '../steps/make-a-claim/start/stepRegistry';

import { Logger } from '@modules/logger';
import { getTranslationFunction, stepDependencyCheckMiddleware, withStepContext } from '@modules/steps';
import type { GetController } from '@modules/steps/controller';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { ccdCaseService } from '@services/ccdCaseService';
import { getPaymentSessionState, persistPaymentSessionState } from '@services/paymentSessionService';
import { paymentService } from '@services/pcsApi/paymentService';
import { sanitiseCaseReference } from '@utils/caseReference';
import { safeRedirect303 } from '@utils/safeRedirect';

const logger = Logger.getLogger('makeAClaim');

function controllerOf(step: StepDefinition): GetController {
  return typeof step.getController === 'function' ? step.getController() : step.getController;
}

/** Mounts the pages asked before a claim exists, each signed in unless its flow says otherwise. */
function registerStartSteps(app: Application): void {
  for (const step of Object.values(startStepRegistry)) {
    const requiresAuth = startFlowConfig.steps[step.name]?.requiresAuth !== false;
    const auth: RequestHandler[] = requiresAuth ? [oidcMiddleware] : [];
    const context = withStepContext({ name: step.name, journey: 'makeAClaim' });
    app.get(step.url, context, ...auth, stepDependencyCheckMiddleware(startFlowConfig), (req, res) =>
      controllerOf(step).get(req, res)
    );
    if (step.postController) {
      app.post(step.url, context, ...auth, step.postController.post);
    }
  }
}

interface ClaimFeeDetails {
  serviceRequestReference: string;
  feeAmount: number;
}

/** The fee to pay for a submitted claim: from the session the submission set, or from the case as pcs-api saved it. */
async function claimFeeFor(req: Request, caseReference: string): Promise<ClaimFeeDetails | undefined> {
  const session = getPaymentSessionState(req);
  if (session?.caseReference === caseReference && session.serviceRequestReference && session.feeAmount !== undefined) {
    return { serviceRequestReference: session.serviceRequestReference, feeAmount: session.feeAmount };
  }
  const accessToken = req.session.user?.accessToken as string;
  const submission = (await ccdCaseService.getCaseById(accessToken, caseReference)).data.citizenPossessionClaim
    ?.submission;
  if (submission?.serviceRequestReference && submission.feeAmount) {
    return {
      serviceRequestReference: submission.serviceRequestReference,
      feeAmount: Number(submission.feeAmount) / 100,
    };
  }
  return undefined;
}

function caseReferenceOf(req: Request): string {
  const caseReference = sanitiseCaseReference(String(req.params.caseReference ?? ''));
  if (!caseReference) {
    throw new HTTPError('Invalid case reference format', 404);
  }
  return caseReference;
}

function pageContent(req: Request, keys: string[], prefix: string): Record<string, unknown> {
  const t = getTranslationFunction(req, ['makeAClaim', 'common']);
  return {
    t,
    signedIn: true,
    ...Object.fromEntries(keys.map(key => [key, t(`makeAClaim:${prefix}.${key}`, { returnObjects: true })])),
  };
}

function registerSubmittedClaimRoutes(app: Application): void {
  app.get(
    '/case/:caseReference/pay-claim-fee',
    oidcMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const caseReference = caseReferenceOf(req);
        const fee = await claimFeeFor(req, caseReference);
        if (!fee) {
          return res.redirect(303, `/case/${caseReference}/claim-submitted`);
        }
        await persistPaymentSessionState(req, { ...getPaymentSessionState(req), caseReference, ...fee });
        const content = pageContent(
          req,
          [
            'pageTitle',
            'heading',
            'feeHeading',
            'amountHeading',
            'feeName',
            'redirectText',
            'payButton',
            'problemTitle',
          ],
          'payClaimFee'
        );
        const t = content.t as ReturnType<typeof getTranslationFunction>;
        res.render('make-a-claim/templates/payClaimFee.njk', {
          ...content,
          feeAmount: formatPence(Math.round(fee.feeAmount * 100)),
          payUrl: `/case/${caseReference}/pay-claim-fee/start`,
          paymentProblem: ['failed', 'pending'].includes(String(req.query.payment))
            ? t(`makeAClaim:payClaimFee.payment.${req.query.payment}`)
            : undefined,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  app.get(
    '/case/:caseReference/pay-claim-fee/start',
    oidcMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const caseReference = caseReferenceOf(req);
        const fee = await claimFeeFor(req, caseReference);
        if (!fee) {
          return res.redirect(303, `/case/${caseReference}/claim-submitted`);
        }
        const payment = await paymentService.startCardPaymentRequest({
          accessToken: req.session.user?.accessToken as string,
          serviceRequestReference: fee.serviceRequestReference,
          amount: fee.feeAmount,
          requestLanguage: req.language,
          returnUrl: config.get<string>('payment.returnUrl'),
        });
        await persistPaymentSessionState(req, {
          caseReference,
          ...fee,
          paymentReference: payment.paymentReference,
          successRedirectUrl: `/case/${caseReference}/claim-submitted?status=success`,
          pendingRedirectUrl: `/case/${caseReference}/claim-submitted?status=pending`,
          failureRedirectUrl: `/case/${caseReference}/pay-claim-fee?payment=failed`,
        });
        return res.redirect(303, payment.nextUrl);
      } catch (error) {
        logger.error('Failed to start the claim fee card payment', error);
        const caseReference = sanitiseCaseReference(String(req.params.caseReference ?? ''));
        return caseReference
          ? safeRedirect303(res, `/case/${caseReference}/pay-claim-fee?payment=failed`, '/', ['/case'])
          : next(error);
      }
    }
  );

  app.get(
    '/case/:caseReference/claim-submitted',
    oidcMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const caseReference = caseReferenceOf(req);
        await ccdCaseService.getCaseById(req.session.user?.accessToken as string, caseReference);
        const content = pageContent(
          req,
          ['pageTitle', 'whatHappensNextHeading', 'whatHappensNext', 'feedbackLink'],
          'claimSubmitted'
        );
        const t = content.t as ReturnType<typeof getTranslationFunction>;
        const pending = req.query.status === 'pending';
        res.render('make-a-claim/templates/claimSubmitted.njk', {
          ...content,
          panelTitle: t(pending ? 'makeAClaim:claimSubmitted.pendingTitle' : 'makeAClaim:claimSubmitted.panelTitle'),
          panelText: t('makeAClaim:claimSubmitted.panelText', {
            caseNumber: caseReference.replace(/(\d{4})(?=\d)/g, '$1 '),
          }),
          feedbackUrl: 'https://www.smartsurvey.co.uk/s/Poss_feedback/',
        });
      } catch (error) {
        next(error);
      }
    }
  );
}

export default function makeAClaimRoutes(app: Application): void {
  registerStartSteps(app);
  registerSubmittedClaimRoutes(app);
}
