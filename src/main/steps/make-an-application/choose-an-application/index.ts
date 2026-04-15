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
          hint: 'options.adjourn.hint',
        },
        {
          value: 'SET_ASIDE',
          translationKey: 'options.setAside.label',
          hint: 'options.setAside.hint',
        },
        { value: 'SOMETHING_ELSE', translationKey: 'options.somethingElse.label', hint: 'options.somethingElse.hint' },
      ],
    },
  ],
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    heading: 'heading',
    noticeText: 'noticeText',
    noticeTextByPost: 'noticeTextByPost',
    readTheGuidance: 'noticeTextList.readTheGuidance',
    fillInTheForm: 'noticeTextList.fillInTheForm',
    findYourLocalCourt: 'noticeTextList.findYourLocalCourt',
    sendTheFormToTheCourt: 'noticeTextList.sendTheFormToTheCourt',
  },
});
