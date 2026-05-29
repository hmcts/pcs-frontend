import type { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware/oidc';

import { Logger } from '@modules/logger';
import { clearPaymentSessionState } from '@services/paymentSessionService';
import { getPaymentOutcome, paymentService } from '@services/pcsApi/paymentService';
import { safeRedirect303 } from '@utils/safeRedirect';

const logger = Logger.getLogger('paymentReturn');

function getDefaultReturnPath(caseReference?: string): string {
  return caseReference ? `/case/${caseReference}` : '/';
}

export default function paymentReturnRoutes(app: Application): void {
  app.get('/payment/return', oidcMiddleware, async (req: Request, res: Response) => {
    const paymentSession = req.session.payment;
    const accessToken = req.session.user?.accessToken;

    if (!paymentSession?.paymentReference) {
      logger.warn('Payment return called without payment reference in session');
      return safeRedirect303(res, '/', '/', ['/']);
    }

    if (!accessToken) {
      logger.error('Payment return called without user access token');
      return res.status(401).render('error', { error: 'Authentication required' });
    }

    const defaultReturnPath = getDefaultReturnPath(paymentSession.caseReference);

    try {
      const statusResponse = await paymentService.getCardPaymentStatus(accessToken, paymentSession.paymentReference);
      const outcome = getPaymentOutcome(statusResponse.status);

      const successRedirectUrl = paymentSession.successRedirectUrl || defaultReturnPath;
      const failureRedirectUrl = paymentSession.failureRedirectUrl || defaultReturnPath;
      const pendingRedirectUrl = paymentSession.pendingRedirectUrl || failureRedirectUrl;

      let redirectTarget = pendingRedirectUrl;

      if (outcome === 'success') {
        redirectTarget = successRedirectUrl;
      } else if (outcome === 'failure') {
        redirectTarget = failureRedirectUrl;
      }

      if (outcome !== 'pending') {
        clearPaymentSessionState(req);
      }

      return safeRedirect303(res, redirectTarget, defaultReturnPath, ['/case', '/dashboard', '/payment']);
    } catch (error) {
      logger.error('Failed to retrieve card payment status on return callback', error);
      return safeRedirect303(res, paymentSession.failureRedirectUrl, defaultReturnPath, [
        '/case',
        '/dashboard',
        '/payment',
      ]);
    }
  });
}
