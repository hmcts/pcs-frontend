import { StepDraft } from '../../../../modules/journey/engine/schema';

const step: StepDraft = {
  id: 'summary',
  type: 'summary',
  title: 'summary.title',
  description: 'summary.description',
  next: 'confirmation',
};

export default step;
