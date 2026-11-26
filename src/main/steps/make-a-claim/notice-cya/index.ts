import { createSectionSummaryStep } from '../sectionSummaryStep';
import { noticeCard } from '../summary';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createSectionSummaryStep({
  stepName: 'notice-cya',
  stepDir: __dirname,
  cards: req => [noticeCard(req)],
});
