import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'response-submitted-counterclaim-fee-payment-needed',
  stepDir: __dirname,
  fields: [],
  customTemplate: `${__dirname}/responseSubmittedCounterclaimFeePaymentNeeded.njk`,
});
