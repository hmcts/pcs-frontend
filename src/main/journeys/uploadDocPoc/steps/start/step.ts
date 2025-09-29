import { StepDraft } from '../../../../modules/journey/engine/schema';

const step: StepDraft = {
  id: 'start',
  title: 'Document Upload POC',
  type: 'form',
  fields: {
    startButton: {
      type: 'button',
      text: 'Start',
      attributes: {
        type: 'submit',
      },
    },
  },
  next: 'page2',
};

export default step;
