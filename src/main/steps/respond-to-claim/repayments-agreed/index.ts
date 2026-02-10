import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';


export const step: StepDefinition = createFormStep({
  stepName: 'repayments-agreed',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/repaymentsAgreed.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
  },
  fields: [],
});
