import { StepDraft } from '../../../../modules/journey/engine/schema';

const step: StepDraft = {
  id: 'confirmation',
  title: 'eligibility.confirmation.title',
  type: 'confirmation',
  data: {
    referenceNumber: true,
    nextSteps: 'eligibility.confirmation.whatNext2',
  },
};

export default step;
