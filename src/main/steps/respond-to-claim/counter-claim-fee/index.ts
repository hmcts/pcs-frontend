
import { createRespondToClaimFormStep } from '../formStep';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'counter-claim-fee',
  stepDir: __dirname,
  customTemplate: `${__dirname}/counterClaimFee.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
  },
  fields: [],
});
