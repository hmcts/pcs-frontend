import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createFormStep({
  stepName: 'choose-an-application',
  journeyFolder: 'makeAnApplication',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/chooseAnApplication.njk`,
  fields: [
    {
      name: 'typeOfApplication',
      type: 'radio',
      required: true,
      translationKey: { label: 'question' },
      legendClasses: 'govuk-fieldset__legend--m',
      options: [
        {
          value: 'ADJOURN',
          translationKey: 'options.adjourn.label',
          // TODO: Hint text translation support to be added as part of HDPI-5208
          hint: 'You can apply to delay the hearing until a later date.',
        },
        {
          value: 'SET_ASIDE',
          translationKey: 'options.setAside.label',
          // TODO: Hint text translation support to be added as part of HDPI-5208
          hint: `You can ask the court to set aside the possession order if you have good reason.
             For example, if you were unable to attend the court hearing because you were ill.`,
        },
        { value: 'SOMETHING_ELSE', translationKey: 'options.somethingElse.label' },
      ],
    },
  ],
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    heading: 'heading',
  },
});
