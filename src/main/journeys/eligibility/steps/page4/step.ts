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
        errorMessages: {
          day: 'Enter a valid day!!!!',
          month: 'Enter a valid month!!!!',
          year: 'Enter a valid year!!!!',
          required: 'Enter your date of birth!!!!',
          incomplete: 'Date of birth must include a day, month and year!!!!',
          invalid: 'Date of birth must be a real date!!!!',
          future: 'Date of birth must be in the past!!!!!',
        },
      },
    },
    postcode: {
      type: 'text',
      label: 'Postcode',
    },
  },
  next: 'summary',
};

export default step;
