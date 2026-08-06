import config from 'config';
import type { Application, NextFunction, Request, Response } from 'express';

import { HTTPError } from '../HttpError';
import { oidcMiddleware } from '../middleware';

import { Logger } from '@modules/logger';
import { persistPaymentSessionState } from '@services/paymentSessionService';
import { paymentService } from '@services/pcsApi/paymentService';
import { safeRedirect303 } from '@utils/safeRedirect';

const logger = Logger.getLogger('counterClaimPaymentStart');

export default function counterClaimPaymentStartRoutes(app: Application): void {
  app.get(
    '/case/:caseReference/respond-to-claim/counter-claim-payment/start',
    oidcMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      const caseReference = String(req.params.caseReference || '');
      const accessToken = req.session.user?.accessToken;
      const { serviceRequestReference, feeAmount } = req.session.payment ?? {};

      if (!accessToken) {
        return redirectOnMissingAccessToken(caseReference, next);
      }

      if (!serviceRequestReference || feeAmount === undefined) {
        return redirectOnMissingPaymentSessionData(res, caseReference);
      }

      const paymentReturnUrl = config.get<string>('payment.returnUrl');

      if (!paymentReturnUrl) {
        return redirectOnMissingPaymentReturnUrl(res, caseReference);
      }

      try {
        const paymentResponse = await paymentService.startCardPaymentRequest({
          accessToken,
          serviceRequestReference,
          amount: feeAmount,
          requestLanguage: req.language,
          returnUrl: paymentReturnUrl,
        });

        await persistPaymentSessionState(req, {
          ...req.session.payment,
          caseReference,
          serviceRequestReference,
          feeAmount,
          paymentReference: paymentResponse.paymentReference,
          successRedirectUrl: `/case/${caseReference}/respond-to-claim/counter-claim-payment-successful`,
          failureRedirectUrl: `/case/${caseReference}/respond-to-claim/counter-claim-application-fee-amount?payment=failed`,
          pendingRedirectUrl: `/case/${caseReference}/respond-to-claim/counter-claim-application-fee-amount?payment=pending`,
        });

        return res.redirect(303, paymentResponse.nextUrl);
      } catch (error) {
        logger.error(`Failed to create counterclaim card payment request for case ${caseReference}`, error);
        return safeRedirect303(
          res,
          `/case/${caseReference}/respond-to-claim/counter-claim-application-fee-amount?payment=failed`,
          `/case/${caseReference}`,
          ['/case']
        );
      }
    }
  );

  app.get(
    '/case/:caseReference/respond-to-claim/counter-claim-pba-payment/start',
    oidcMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      const caseReference = String(req.params.caseReference || '');
      const accessToken = req.session.user?.accessToken;
      const { serviceRequestReference, feeAmount, customerReference, pbaAccount } = req.session.payment ?? {};

      if (!accessToken) {
        return redirectOnMissingAccessToken(caseReference, next);
      }

      if (!serviceRequestReference || feeAmount === undefined) {
        return redirectOnMissingPaymentSessionData(res, caseReference);
      }

      const paymentReturnUrl = config.get<string>('payment.returnUrl');

      if (!paymentReturnUrl) {
        return redirectOnMissingPaymentReturnUrl(res, caseReference);
      }

      try {
        const paymentResponse = await paymentService.startPbaPaymentRequest({
          accessToken,
          serviceRequestReference,
          amount: feeAmount,
          pbaAccount,
          customerReference,
        });

        await persistPaymentSessionState(req, {
          ...req.session.payment,
          caseReference,
          serviceRequestReference,
          feeAmount,
          paymentReference: paymentResponse.paymentReference,
        });

        return res.redirect(303, `/case/${caseReference}/respond-to-claim/counter-claim-payment-successful`);
      } catch (error) {
        logger.error(`Failed to create counterclaim PBA payment request for case ${caseReference}`, error);
        return safeRedirect303(
          res,
          `/case/${caseReference}/respond-to-claim/counter-claim-application-fee-amount?payment=failed`,
          `/case/${caseReference}`,
          ['/case']
        );
      }
    }
  );
}

function redirectOnMissingAccessToken(caseReference: string, next: NextFunction) {
  logger.error(`Missing access token when starting counterclaim payment for case ${caseReference}`);
  return next(new HTTPError('Authentication required', 401));
}

function redirectOnMissingPaymentSessionData(res: Response, caseReference: string) {
  logger.warn(`Missing payment session data for counterclaim payment start case ${caseReference}`);
  return safeRedirect303(
    res,
    `/case/${caseReference}/respond-to-claim/counter-claim-application-fee-amount`,
    `/case/${caseReference}`,
    ['/case']
  );
}

function redirectOnMissingPaymentReturnUrl(res: Response, caseReference: string) {
  logger.error(`No payment return URL configured when starting counterclaim payment for case ${caseReference}`);
  return safeRedirect303(
    res,
    `/case/${caseReference}/respond-to-claim/counter-claim-application-fee-amount?payment=failed`,
    `/case/${caseReference}`,
    ['/case']
  );
}
