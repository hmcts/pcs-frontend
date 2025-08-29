import { StepDraft } from '../../../../modules/journey/engine/schema';

const step: StepDraft = {
  id: 'page5',
  type: 'form',
  title: 'page5.title',
  fields: {
    date: {
      type: 'date',
      hint: {
        text: 'page5.fields.date.hint',
      },
      validate: { required: true, mustBePast: true },
      errorMessages: {
        required: 'errors.date.required',
        notRealDate: 'errors.date.notRealDate',
        invalidPart: (field: string) => {
          switch (field) {
            case 'day':
              return 'errors.date.invalidDay';
            case 'month':
              return 'errors.date.invalidMonth';
            case 'year':
              return 'errors.date.invalidYear';
            default:
              return 'errors.date.invalidValue';
          }
        },
      },
    },
    email: {
      type: 'email',
      label: {
        text: 'page5.fields.email.label',
      },
      validate: {
        required: true,
        customMessage: 'errors.email.invalid',
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
