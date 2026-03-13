import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep({
  stepName: 'tenancy-date-unknown',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  fields: [],
  customTemplate: `${__dirname}/tenancyDateUnknown.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    heading: 'heading',
    body: 'body',
  },
});
