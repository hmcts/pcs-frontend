import { createSectionSummaryStep } from '../sectionSummaryStep';
import { circumstancesCard } from '../summary';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createSectionSummaryStep({
  stepName: 'situation-cya',
  stepDir: __dirname,
  cards: req => [circumstancesCard(req)],
});
