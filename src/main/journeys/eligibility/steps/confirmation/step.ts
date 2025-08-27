import { StepDraft } from '../../../../modules/journey/engine/schema';

const step: StepDraft = {
  id: 'confirmation',
  title: 'confirmation.title',
  type: 'confirmation',
  data: {
    referenceNumber: true,
    nextSteps: 'confirmation.whatNext2',
  },
};

export default step;
