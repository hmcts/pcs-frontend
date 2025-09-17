import { StepDraft } from '../../../../modules/journey/engine/schema';

const step: StepDraft = {
  id: 'page3',
  type: 'form',
  title: 'page3.title',
  description: 'page3.description',
  fields: {
    grounds: {
      type: 'checkboxes',
      items: [
        {
          value: 'rent-arrears-8',
          text: 'page3.options.rentArrears8.text',
          hint: 'page3.options.rentArrears8.hint',
        },
        {
          value: 'breach-contract-9',
          text: 'page3.options.breachContract9.text',
          hint: 'page3.options.breachContract9.hint',
        },
        {
          value: 'other-10',
          text: 'page3.options.other10.text',
          hint: 'page3.options.other10.hint',
        },
      ],
      validate: {
        required: true,
        minLength: 1,
        customMessage: 'page3.errors.groundsRequired',
      },
    },
    continueButton: {
      type: 'button',
      text: 'buttons.continue',
      attributes: { type: 'submit' },
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
