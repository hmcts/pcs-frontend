import { StepDraft } from '../../../../modules/journey/engine/schema';

const step: StepDraft = {
  id: 'page4',
  type: 'form',
  title: 'page4.title',
  fields: {
    title: {
      type: 'select',
      label: { text: 'page4.fields.title.label' },
      items: [
        { value: 'Mr', text: 'page4.fields.title.items.mr' },
        { value: 'Ms', text: 'page4.fields.title.items.ms' },
        { value: 'Miss', text: 'page4.fields.title.items.miss' },
        { value: 'Mrs', text: 'page4.fields.title.items.mrs' },
      ],
      validate: {
        required: true,
        customMessage: 'page4.errors.title.required',
      },
    },
    firstName: {
      type: 'text',
      label: { text: 'page4.fields.firstName.label' },
      validate: {
        required: true,
        customMessage: 'page4.errors.firstName.required',
        minLength: 5,
        maxLength: 20,
        customMessage: 'page4.errors.firstName.required',
      },
    },
    lastName: {
      type: 'text',
      label: { text: 'page4.fields.lastName.label' },
      validate: {
        required: true,
        minLength: 5,
        maxLength: 20,
        customMessage: 'page4.errors.lastName.required',
      },
    },
    continueButton: {
      type: 'button',
      text: 'buttons.continue',
      attributes: { type: 'submit' },
    },
  },
  next: 'page5',
};

export default step;
