import { StepDraft } from '../../../../modules/journey/engine/schema';

const step: StepDraft = {
  id: 'start',
  title: 'Before you start',
  type: 'form',
  description: "Information about what you'll need for your possession claim",
  next: 'page2',
};

export default step; 