import { StepDraft } from '../../../../modules/journey/engine/schema';

const step: StepDraft = {
  id: 'page5',
  title: 'Enter your personal and contact details',
  type: 'form',
  fields: {
    date: {
      type: 'date',
      hint: {
        text: 'Date of birth',
      },
      validate: { required: true },
      errorMessages: {
        required: 'Please enter a date',
        day: 'Please enter a valid day',
        month: 'Please enter a valid month',
        year: 'Please enter a valid year',
        invalid: 'Please enter a valid date of birth',
      },
    },
    email: {
      type: 'email',
      label: {
        text: 'Email address',
      },
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
