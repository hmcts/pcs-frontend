import { StepDraft } from '../../../../modules/journey/engine/schema';

const step: StepDraft = {
  id: 'start',
  title: 'Respond to a property possession claim online',
  type: 'form',
  description:
    'There’s no fee to respond to a claim. You must respond within 14 days of receiving the claim pack in the post. This service is also available in Welsh (Cymraeg).',
  fields: {
    startButton: {
      type: 'button',
      text: 'startButton.text',
      attributes: {
        type: 'submit',
      },
    },
  },
  next: 'legalAdvice',
};

export default step;
