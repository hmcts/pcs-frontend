import { createSectionSummaryStep } from '../sectionSummaryStep';
import { defendantsCard } from '../summary';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createSectionSummaryStep({
  stepName: 'defendant-cya',
  stepDir: __dirname,
  cards: req => [defendantsCard(req)],
});
