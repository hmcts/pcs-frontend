import { StepDraft } from '../../../../modules/journey/engine/schema';

const step: StepDraft = {
  id: 'start',
  type: 'form',
  next: 'page2',
  fields: {
    startButton: {
      type: 'button',
      attributes: {
        type: 'submit',
      },
    },
  },
};

export default step;
