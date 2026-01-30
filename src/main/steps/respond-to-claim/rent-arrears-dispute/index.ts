import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep(
  {
    stepName: 'rent-arrears-dispute',
    journeyFolder: 'respondToClaim',
    stepDir: __dirname,
    flowConfig,
    translationKeys: {
      pageTitle: 'pageTitle',
      caption: 'caption',
    },
    fields: [],
  },
  `${__dirname}/rentArrearsDispute.njk`
);
