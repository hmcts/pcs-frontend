import { StepDraft } from '../../../../modules/journey/engine/schema';

const step: StepDraft = {
  id: 'start',
  title: 'startPage.title',
  type: 'form',
  description: 'startPage.description',
  fields: {
    startButton: {
      type: 'button',
      text: 'startButton.text',
      attributes: {
        type: 'submit',
      },
    },
  },
  next: 'page2',
};

export default step;
