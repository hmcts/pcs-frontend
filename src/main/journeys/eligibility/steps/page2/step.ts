import { StepDraft } from '../../../../modules/journey/engine/schema';

const step: StepDraft = {
  id: 'page2',
  type: 'form',
  fields: {
    age: {
      type: 'radios',
      fieldset: {
        legend: {
          text: 'stepAre you 18 or over?',
          isPageHeading: true,
          classes: 'govuk-fieldset__legend--l',
        },
      },
      options: [
        { value: 'yes', text: 'stepYes' },
        { value: 'no', text: 'stepNo' },
      ],
      validate: {
        required: true,
        customMessage: 'stepSelect yes or no',
      },
    },
    continueButton: {
      type: 'button',
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
