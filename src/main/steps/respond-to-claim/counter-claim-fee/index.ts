import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createFormStep({
  stepName: 'counter-claim-fee',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/counterClaimFee.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
  },
  fields: [],
});
