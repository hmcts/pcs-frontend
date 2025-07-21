import { StepDraft } from '../../../../modules/journey/engine/schema';

const step: StepDraft = {
  id: 'page5',
  title: 'Enter your personal and contact details',
  type: 'form',
  fields: {
    date: {
      type: 'date',
      label: 'Date of birth',
      validate: { required: true },
      errorMessages: {
        required: 'Please enter a date',
        invalid: 'Please enter a valid date now!!!',
        day: 'Please enter a valid day',
        month: 'Please enter a valid month',
        year: 'Please enter a valid year',
      },
    },
    email: {
      type: 'email',
      label: 'Email address',
      validate: { required: true, email: true },
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
