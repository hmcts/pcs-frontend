import { StepDraft } from '../../../../modules/journey/engine/schema';

const step: StepDraft = {
  id: 'page4',
  title: 'What is your address?',
  type: 'form',
  description: 'We need to know your address to send you a copy of the claim',
  fields: {
    address: {
      type: 'text',
      label: 'Address',
    },
    date: {
      type: 'date',
      label: 'Date of birth',
      validate: {
        required: true,
        customMessage: 'Enter a valid date of birth',
      },
    },
    postcode: {
      type: 'text',
      label: 'Postcode',
    },
    continueButton: {
      type: 'button',
      attributes: {
        type: 'submit',
      },
    },
  },
  next: 'summary',
};

export default step;
