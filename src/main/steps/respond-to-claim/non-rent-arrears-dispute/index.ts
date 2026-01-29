import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep(
  {
    stepName: 'non-rent-arrears-dispute',
    journeyFolder: 'respondToClaim',
    stepDir: __dirname,
    flowConfig,
    translationKeys: {
      pageTitle: 'pageTitle',
    },
    fields: [],
  },
  `${__dirname}/nonRentArrearsDispute.njk`
);
