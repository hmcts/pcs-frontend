import { StepDraft } from '../../../../modules/journey/engine/schema';

const step: StepDraft = {
  id: 'legalAdvice',
  type: 'form',
  title: "You're entitled to free legal advice before you submit your response",
  fields: {
    legalAdvice: {
      type: 'radios',
      fieldset: {
        legend: {
          text: 'Have you had any free legal advice?',
        },
      },
      items: [
        {
          value: 'yes',
          text: 'Yes',
        },
        {
          value: 'no',
          text: 'No',
        },
        {
          divider: 'or',
          value: 'or',
        },
        {
          value: 'preferNotToSay',
          text: 'Prefer not to say',
        },
      ],
      validate: {
        required: true,
        customMessage: 'Select yes, no, or prefer not to say',
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
  next: 'correctName',
};

export default step;
