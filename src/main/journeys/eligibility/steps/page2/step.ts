import { StepDraft } from '../../../../modules/journey/engine/schema';

const step: StepDraft = {
  id: 'page2',
  title: 'page2.title', // Reference translation key for the title
  type: 'form',
  description: 'page2.description', // Reference translation key for description
  fields: {
    age: {
      type: 'radios',
      fieldset: {
        legend: {
          text: 'page2.ageLabel', // Translation key for label
          isPageHeading: true,
          classes: 'govuk-fieldset__legend--l',
        },
      },
      options: [
        { value: 'yes', text: 'page2.ageOptions.yes' }, // Translation key for option text
        { value: 'no', text: 'page2.ageOptions.no' }, // Translation key for option text
      ],
      validate: {
        required: true,
        customMessage: 'page2.ageDescription', // Translation key for custom error message
      },
    },
    continueButton: {
      type: 'button',
      text: 'buttons.continue', // Reference to the 'continue' translation key in common.json
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
