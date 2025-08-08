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
        notRealDate: 'Enter a valid date of birth',
        invalidPart: field => {
          switch (field) {
            case 'day':
              return 'Enter a valid day';
            case 'month':
              return 'Enter a valid month';
            case 'year':
              return 'Enter a valid year';
            default:
              return 'Enter a valid value';
          }
        },
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
