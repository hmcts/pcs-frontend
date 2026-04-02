import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'language-used',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/languageUsed.njk`,
    translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    caption: 'caption',

  },
  fields: [
    {
      name: 'languageUsed',
      type: 'radio',
      required: true,
      legendClasses: 'govuk-visually-hidden',
      translationKey: {
        label: 'heading',
      },
      errorMessage: 'errors.languageUsed',
      options: [
        { value: 'ENGLISH', translationKey: 'language.english' },
        { value: 'WELSH', translationKey: 'language.welsh' },
        { value: 'ENGLISH_AND_WELSH', translationKey: 'language.englishAndWelsh' },
      ],
    },
  ],
});
