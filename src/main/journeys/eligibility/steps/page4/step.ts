import { StepDraft } from '../../../../modules/journey/engine/schema';

const step: StepDraft = {
  id: 'page4',
  title: 'Enter your personal details',
  type: 'form',
  fields: {
    title: {
      type: 'select',
      label: {
        text: 'Title',
      },
      items: [
        { value: 'Mr', text: 'Mr' },
        { value: 'Ms', text: 'Ms' },
        { value: 'Miss', text: 'Miss' },
        { value: 'Mrs', text: 'Mrs' },
      ],
    },
    firstName: {
      type: 'text',
      label: {
        text: 'First Name',
      },
      validate: {
        required: true,
        minLength: 5,
        maxLength: 20,
        customMessage: 'Enter a first name',
      },
    },
    lastName: {
      type: 'text',
      label: {
        text: 'Last Name',
      },
      validate: {
        required: true,
        minLength: 5,
        maxLength: 20,
        customMessage: 'Enter a last name',
      },
    },
    continueButton: {
      type: 'button',
      attributes: {
        type: 'submit',
      },
    },
  },
  next: 'page5',
};

export default step;
