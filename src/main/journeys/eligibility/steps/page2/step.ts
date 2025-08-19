import { StepDraft } from '../../../../modules/journey/engine/schema';

const step: StepDraft = {
  id: 'page2',
  type: 'form',
  fields: {
    age: {
      type: 'radios',
      fieldset: {
        legend: {
          text: 'page2.ageLabel',
          isPageHeading: true,
          classes: 'govuk-fieldset__legend--l',
        },
      },
      options: [
        { value: 'yes', text: 'page2.ageOptions.yes' },
        { value: 'no', text: 'page2.ageOptions.no' },
      ],
      validate: {
        required: true,
        customMessage: 'page2.ageDescription',
      },
    },
    continueButton: {
      type: 'button',
      text: 'buttons.continue',
      attributes: {
        type: 'submit',
      },
    },
  },
  next: {
    when: (stepData: Record<string, unknown>) => stepData['age'] === 'yes',
    goto: 'page3',
    else: 'ineligible',
  },
};

export default step;
