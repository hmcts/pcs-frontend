import { StepDraft } from '../../../../modules/journey/engine/schema';

const step: StepDraft = {
  id: 'page2',
  title: 'Are you 18 or over?',
  type: 'form',
  description: 'You must be 18 or over to make a possession claim',
  fields: {
    age: {
      type: 'radios',
      label: 'Are you 18 or over?',
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
