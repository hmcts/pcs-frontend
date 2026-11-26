import { createSectionSummaryStep } from '../sectionSummaryStep';
import { aboutYouCard, additionalClaimantCards } from '../summary';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createSectionSummaryStep({
  stepName: 'claimant-cya',
  stepDir: __dirname,
  cards: req => [aboutYouCard(req), ...additionalClaimantCards(req)],
});
