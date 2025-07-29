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
        required: 'Enter a date',
        day: 'Enter a valid day',
        month: 'Enter a valid month',
        year: 'Enter a valid year',
        invalid: 'Enter a valid date of birth',
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
