import config from 'config';
import type { Application, NextFunction, Request, RequestHandler, Response } from 'express';

import { HTTPError } from '../HttpError';
import {
  CLAIM_SUBMITTED_ROUTE,
  MAKE_A_CLAIM_ROUTE,
  PAY_CLAIM_FEE_ROUTE,
  PAY_CLAIM_FEE_START_ROUTE,
  makeAClaimPath,
} from '../constants/makeAClaimRoutes';
import { oidcMiddleware } from '../middleware';
import { taskListPath } from '../steps/make-a-claim/flow.config';
import { formatPence } from '../steps/make-a-claim/rentHistory';
import { startFlowConfig } from '../steps/make-a-claim/start/flow.config';
import { startStepRegistry } from '../steps/make-a-claim/start/stepRegistry';
import { AWAITING_SUBMISSION, submittedClaimRedirect } from '../steps/make-a-claim/submittedClaim';
import { penceToPounds } from '../steps/utils/currencyConversion';

import { Logger } from '@modules/logger';
import { getTranslationFunction, stepDependencyCheckMiddleware, withStepContext } from '@modules/steps';
import type { GetController } from '@modules/steps/controller';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { ccdCaseService } from '@services/ccdCaseService';
import { getPaymentSessionState, persistPaymentSessionState } from '@services/paymentSessionService';
import { getPaymentOutcome, paymentService } from '@services/pcsApi/paymentService';
import { formatCaseReferenceForDisplay, sanitiseCaseReference } from '@utils/caseReference';
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
  feeAmountInPence: string;
  paid: boolean;
}

/**
 * The fee for a submitted claim, as pcs-api keeps it on the case, or as the submit gave it when the case does
 * not show it yet. Reading the case each time also confirms the claimant can see it.
 */
async function claimFeeFor(req: Request, caseReference: string): Promise<ClaimFeeDetails | undefined> {
  const accessToken = req.session.user?.accessToken as string;
  const submission = (await ccdCaseService.getCaseById(accessToken, caseReference)).data.citizenPossessionClaim
    ?.submission;
  const paid = submission?.paymentStatus === 'PAID';
  if (submission?.serviceRequestReference && submission.feeAmount) {
    return {
      serviceRequestReference: submission.serviceRequestReference,
      feeAmountInPence: submission.feeAmount,
      paid,
    };
  }
  const session = getPaymentSessionState(req);
  if (session?.caseReference === caseReference && session.serviceRequestReference && session.feeAmountInPence) {
    return {
      serviceRequestReference: session.serviceRequestReference,
      feeAmountInPence: session.feeAmountInPence,
      paid,
    };
  }
  return undefined;
}

/**
 * Whether the card payment last started for this claim's fee went through. pcs-api learns of it from Payments a
 * little later, so until then the claim's own payment status would still offer to take the fee again. A payment
 * not yet finished, or one the claimant abandoned, does not count, so they can always pay.
 */
async function cardPaymentSucceeded(req: Request, caseReference: string): Promise<boolean> {
  const paymentReference = req.session.claimFeePayments?.[caseReference];
  if (!paymentReference) {
    return false;
  }
  try {
    const { status } = await paymentService.getCardPaymentStatus(
      req.session.user?.accessToken as string,
      paymentReference
    );
    return getPaymentOutcome(status) === 'success';
  } catch (error) {
    logger.warn('Could not read the claim fee card payment status', error);
    return false;
  }
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
  app.get(PAY_CLAIM_FEE_ROUTE, oidcMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const caseReference = caseReferenceOf(req);
      const fee = await claimFeeFor(req, caseReference);
      if (!fee || fee.paid || (await cardPaymentSucceeded(req, caseReference))) {
        return res.redirect(303, makeAClaimPath(CLAIM_SUBMITTED_ROUTE, caseReference));
      }
      const content = pageContent(
        req,
        ['pageTitle', 'heading', 'feeHeading', 'amountHeading', 'feeName', 'redirectText', 'payButton', 'problemTitle'],
        'payClaimFee'
      );
      const t = content.t as ReturnType<typeof getTranslationFunction>;
      res.render('make-a-claim/templates/payClaimFee.njk', {
        ...content,
        feeAmount: formatPence(fee.feeAmountInPence),
        payUrl: makeAClaimPath(PAY_CLAIM_FEE_START_ROUTE, caseReference),
        paymentProblem: req.query.payment === 'failed' ? t('makeAClaim:payClaimFee.paymentFailed') : undefined,
      });
    } catch (error) {
      next(error);
    }
  });

  app.get(PAY_CLAIM_FEE_START_ROUTE, oidcMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const caseReference = caseReferenceOf(req);
      const fee = await claimFeeFor(req, caseReference);
      if (!fee || fee.paid || (await cardPaymentSucceeded(req, caseReference))) {
        return res.redirect(303, makeAClaimPath(CLAIM_SUBMITTED_ROUTE, caseReference));
      }
      const payment = await paymentService.startCardPaymentRequest({
        accessToken: req.session.user?.accessToken as string,
        serviceRequestReference: fee.serviceRequestReference,
        amount: Number(penceToPounds(fee.feeAmountInPence)),
        requestLanguage: req.language,
        returnUrl: config.get<string>('payment.returnUrl'),
      });
      const submitted = makeAClaimPath(CLAIM_SUBMITTED_ROUTE, caseReference);
      req.session.claimFeePayments = { ...req.session.claimFeePayments, [caseReference]: payment.paymentReference };
      await persistPaymentSessionState(req, {
        caseReference,
        serviceRequestReference: fee.serviceRequestReference,
        feeAmountInPence: fee.feeAmountInPence,
        paymentReference: payment.paymentReference,
        successRedirectUrl: `${submitted}?status=success`,
        pendingRedirectUrl: `${submitted}?status=pending`,
        failureRedirectUrl: `${makeAClaimPath(PAY_CLAIM_FEE_ROUTE, caseReference)}?payment=failed`,
      });
      return res.redirect(303, payment.nextUrl);
    } catch (error) {
      logger.error('Failed to start the claim fee card payment', error);
      const caseReference = sanitiseCaseReference(String(req.params.caseReference ?? ''));
      return caseReference
        ? safeRedirect303(res, `${makeAClaimPath(PAY_CLAIM_FEE_ROUTE, caseReference)}?payment=failed`, '/', ['/case'])
        : next(error);
    }
  });

  app.get(CLAIM_SUBMITTED_ROUTE, oidcMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const caseReference = caseReferenceOf(req);
      const state = (await ccdCaseService.getCaseById(req.session.user?.accessToken as string, caseReference)).state;
      if (state === AWAITING_SUBMISSION) {
        return res.redirect(303, taskListPath(caseReference));
      }
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
          caseNumber: formatCaseReferenceForDisplay(caseReference),
        }),
        feedbackUrl: 'https://www.smartsurvey.co.uk/s/Poss_feedback/',
      });
    } catch (error) {
      next(error);
    }
  });
}

/**
 * A journey page fails once the claim is submitted, because its event only runs on a draft: a second click on
 * Submit, or a page opened in another tab. Send the claimant on to the claim's fee instead of an error page.
 */
async function submittedClaimErrorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const caseReference = sanitiseCaseReference(String(req.params.caseReference ?? ''));
  const accessToken = req.session?.user?.accessToken;
  const redirect = caseReference && accessToken ? await submittedClaimRedirect(accessToken, caseReference) : undefined;
  return redirect ? res.redirect(303, redirect) : next(error);
}

export default function makeAClaimRoutes(app: Application): void {
  registerStartSteps(app);
  registerSubmittedClaimRoutes(app);
  app.use(MAKE_A_CLAIM_ROUTE, submittedClaimErrorHandler);
}
