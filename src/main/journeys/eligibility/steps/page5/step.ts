import { StepDraft } from '../../../../modules/journey/engine/schema';

const step: StepDraft = {
  id: 'page5',
  type: 'form',
  title: 'page5.title',
  fields: {
    date: {
      type: 'date',
      hint: { text: 'page5.fields.date.hint' },
      validate: { required: true },
      errorMessages: {
        required: 'page5.errors.date.required',
        notRealDate: 'page5.errors.date.notRealDate',
        invalidPart: (field: string) => {
          switch (field) {
            case 'day':
              return 'page5.errors.date.invalidDay';
            case 'month':
              return 'page5.errors.date.invalidMonth';
            case 'year':
              return 'page5.errors.date.invalidYear';
            default:
              return 'page5.errors.date.invalidValue';
          }
        },
      },
    },
    email: {
      type: 'email',
      label: { text: 'page5.fields.email.label' },
      validate: { required: true, email: true },
      errorMessages: {
        required: 'page5.errors.email.required',
        invalid: 'page5.errors.email.invalid',
      },
    },
    continueButton: {
      type: 'button',
      text: 'buttons.continue',
      attributes: { type: 'submit' },
    },
  },
  next: 'summary',
};

export default step;
