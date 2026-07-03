import config from 'config';
import { Request } from 'express';

import { HTTPError } from '../../../HttpError';
import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

import { Logger } from '@modules/logger';
import { getStepUrl } from '@modules/steps/flow';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { getPaymentSessionState } from '@services/paymentSessionService';
import {
  CreateCardPaymentRequest,
  mapRequestLanguageToPaymentLanguage,
  paymentService,
} from '@services/pcsApi/paymentService';

const STEP_NAME = 'pay-for-your-application';

const logger = Logger.getLogger(STEP_NAME);

export const step: StepDefinition = createFormStep({
  customTemplate: `${__dirname}/payForYourApplication.njk`,
  fields: [],
  flowConfig,
  journeyFolder: 'makeAnApplication',
  stepDir: __dirname,
  stepName: STEP_NAME,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    applicationFee: 'applicationFee',
    formattedFeeAmount: 'formattedFeeAmount',
    youWillBeRedirected: 'youWillBeRedirected',
    govPayIsASecureService: 'govPayIsASecureService',
    continueToPayment: 'buttons.continueToPayment',
  },
  extendGetContent: async (req: Request) => {
    const accessToken = req.session.user?.accessToken;
    if (!accessToken) {
      logger.warn('User not authenticated - no access token');
      throw new HTTPError('Authentication required', 401);
    }

    const paymentSessionState = getPaymentSessionState(req);

    if (!paymentSessionState) {
      throw new HTTPError('No payment session set up', 500);
    }

    const serviceRequestReference = paymentSessionState.serviceRequestReference;
    if (!serviceRequestReference) {
      logger.warn('No payment service request reference found in session');
      throw new HTTPError('Payment error', 500);
    }

    const feeAmount = paymentSessionState.feeAmount;
    if (!feeAmount) {
      logger.warn('No fee amount found in session');
      throw new HTTPError('Payment error', 500);
    }

    const caseReference = req.res?.locals.validatedCase?.id;

    const paymentReturnUrl = config.get('payment.returnUrl') as string;

    if (!paymentReturnUrl) {
      logger.error('No payment return URL configured');
      throw new HTTPError('Payment error', 500);
    }

    const createCardRequest: CreateCardPaymentRequest = {
      amount: feeAmount,
      language: mapRequestLanguageToPaymentLanguage(req.language),
      returnUrl: paymentReturnUrl,
    };

    const createCardPaymentResponse = await paymentService.createCardPaymentRequest(
      accessToken,
      serviceRequestReference,
      createCardRequest
    );

    paymentSessionState.paymentReference = createCardPaymentResponse.paymentReference;

    const paymentConfirmationUrl = getStepUrl('application-submitted', flowConfig, caseReference);
    const paymentUnsuccessfulUrl = getStepUrl('payment-unsuccessful', flowConfig, caseReference);

    paymentSessionState.successRedirectUrl = paymentConfirmationUrl + '?status=success';
    paymentSessionState.pendingRedirectUrl = paymentConfirmationUrl + '?status=pending';
    paymentSessionState.failureRedirectUrl = paymentUnsuccessfulUrl;

    return {
      feeAmount,
      paymentRedirectUrl: createCardPaymentResponse.nextUrl,
    };
  },
});
