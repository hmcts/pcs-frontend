import { StepDraft } from '../../../../modules/journey/engine/schema';

const step: StepDraft = {
  id: 'page3',
  title: 'What are your grounds for possession?',
  type: 'form',
  description: 'Select all grounds that apply to your case',
  fields: {
    grounds: {
      type: 'checkboxes',
      label: 'Select all that apply',
      options: [
        {
          value: 'rent-arrears-8',
          text: 'Rent arrears (ground 8)',
          hint: "The tenant owes at least 2 months' rent",
        },
        {
          value: 'breach-contract-9',
          text: 'Breach of contract (ground 9)',
          hint: 'The tenant has broken terms of the tenancy agreement',
        },
        {
          value: 'other-10',
          text: 'Other (ground 10)',
          hint: 'Other statutory grounds for possession',
        },
      ],
      validate: {
        required: true,
        minLength: 1,
        customMessage: 'Select at least one option',
      },
    },
  },
  next: {
    when: (_stepData: Record<string, unknown>, allData: Record<string, unknown>) => {
      const grounds = (allData['page3'] as { grounds?: unknown[] })?.grounds ?? [];
      return Array.isArray(grounds) && grounds.length >= 1;
    },
    goto: 'page4',
  },
};

export default step;
