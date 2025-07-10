import { StepDraft } from '../../../../modules/journey/engine/schema';

const step: StepDraft = {
  id: 'page2',
  type: 'form',
  fields: {
    age: {
      type: 'radios',
      fieldset: {
        legend: {
          text: 'Are you 18 or over?',
          isPageHeading: true,
          classes: 'govuk-fieldset__legend--l',
        },
      },
      options: [
        { value: 'yes', text: 'Yes' },
        { value: 'no', text: 'No' },
      ],
      validate: {
        required: true,
        customMessage: 'Select yes or no',
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
