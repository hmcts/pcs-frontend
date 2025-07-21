import { StepDraft } from '../../../../modules/journey/engine/schema';

const step: StepDraft = {
  id: 'page4',
  title: 'Enter your personal details',
  type: 'form',
  fields: {
    title: {
      type: 'select',
      label: 'Title',
      items: [
        { value: 'Mr', text: 'Mr' },
        { value: 'Ms', text: 'Ms' },
        { value: 'Miss', text: 'Miss' },
        { value: 'Mrs', text: 'Mrs' },
      ],
    },
    firstName: {
      type: 'text',
      label: 'First Name',
      validate: {
        required: true,
        customMessage: 'Enter a first name',
      },
    },
    lastName: {
      type: 'text',
      label: 'Last Name',
      validate: {
        required: true,
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
