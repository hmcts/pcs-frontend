import { flowConfig } from '../flow.config';

import type { StepDefinition } from '@interfaces/stepFormData.interface';
import { createFormStep } from '@modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'contact-preferences',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,

  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    content: 'subtitle',
  },
  fields: [],
});
