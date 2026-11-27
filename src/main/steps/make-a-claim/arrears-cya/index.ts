import { createSectionSummaryStep } from '../sectionSummaryStep';
import { rentArrearsCard } from '../summary';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createSectionSummaryStep({
  stepName: 'arrears-cya',
  stepDir: __dirname,
  cards: req => [rentArrearsCard(req)],
});
