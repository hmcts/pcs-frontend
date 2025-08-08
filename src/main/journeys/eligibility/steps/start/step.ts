import { StepDraft } from '../../../../modules/journey/engine/schema';

const step: StepDraft = {
  id: 'start',
  title: 'startPage.title', // Reference to translation key for title
  type: 'form',
  description: 'startPage.description', // Reference to translation key for description
  fields: {
    startButton: {
      type: 'button',
      text: 'startButton.text', // Reference to translation key for button text
      attributes: {
        type: 'submit',
      },
    },
  },
  next: 'page2',
};

export default step;
