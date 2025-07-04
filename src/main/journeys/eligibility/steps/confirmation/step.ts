import { StepDraft } from '../../../../modules/journey/engine/schema';

const step: StepDraft = {
  id: 'confirmation',
  title: 'Application complete',
  type: 'confirmation',
  data: {
    referenceNumber: true,
    nextSteps: 'Your claim will be reviewed within 5 working days',
  },
};

export default step; 