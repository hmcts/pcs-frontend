import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createFormStep({
  stepName: 'have-the-other-parties-agreed-to-this-application',
  journeyFolder: 'makeAnApplication',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/haveTheOtherPartiesAgreedToThisApplication.njk`,
  fields: [
    {
      name: 'otherPartiesAgreed',
      type: 'radio',
      required: true,
      translationKey: { label: 'question' },
      legendClasses: 'govuk-fieldset__legend--m',
      options: [
        {
          value: 'YES',
          translationKey: 'options.yes',
        },
        {
          value: 'NO',
          translationKey: 'options.no',
        },
      ],
    },
  ],
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    heading: 'heading',
  },
});
