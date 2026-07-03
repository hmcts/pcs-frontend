import { Request } from 'express';

import { createFormStep, getStepUrl } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createFormStep({
  stepName: 'payment-unsuccessful',
  journeyFolder: 'makeAnApplication',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/paymentUnsuccessful.njk`,
  fields: [],
  translationKeys: {
    pageTitle: 'pageTitle',
    yourPaymentWasUnsuccessful: 'Your payment was unsuccessful',
    whatHappensNext: 'What happens next',
    youCanTryToMakeACardPayment: 'youCanTryToMakeACardPayment',
    closeAndReturnToCaseOverview: 'buttons.closeAndReturnToCaseOverview',
  },
  extendGetContent: async (req: Request) => {
    const caseReference = req.res?.locals.validatedCase?.id;
    const payForYourApplicationUrl = getStepUrl('pay-for-your-application', flowConfig, caseReference);

    return {
      payForYourApplicationUrl,
    };
  },
});
