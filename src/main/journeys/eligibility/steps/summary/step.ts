import { StepDraft } from '../../../../modules/journey/engine/schema';

const step: StepDraft = {
  id: 'summary',
  title: 'Check your answers',
  type: 'summary',
  description: 'Review your answers before submitting your claim',
  next: 'confirmation',
};

export default step;
