import { StepDraft } from '../../../../modules/journey/engine/schema';

const step: StepDraft = {
  id: 'start',
  title: 'Before you start',
  type: 'form',
  description: "Information about what you'll need for your possession claim",
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
