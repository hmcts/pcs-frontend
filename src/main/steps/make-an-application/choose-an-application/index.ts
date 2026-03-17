import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

// TODO: Error handling and correct save and continue buttons

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
          value: 'SUSPEND',
          translationKey: 'options.suspend.label',
          hint: "You can ask a judge to 'suspend the eviction'. This means stopping or delaying the eviction.",
        },
        {
          value: 'ADJOURN',
          translationKey: 'options.adjourn.label',
          hint: 'You can apply to delay the hearing until a later date.',
        },
        {
          value: 'SET_ASIDE',
          translationKey: 'options.setAside.label',
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
