import { readClaim } from '../claimDraft';
import { needsGroundReasons } from '../conditions';
import { reasonUrl } from '../ground-reason';
import { createSectionSummaryStep } from '../sectionSummaryStep';
import { tenancyCard } from '../summary';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { groundsNeedingReasons } from '@services/citizenPossessionClaim.interface';

export const step: StepDefinition = createSectionSummaryStep({
  stepName: 'tenancy-cya',
  stepDir: __dirname,
  cards: req => [tenancyCard(req, true)],
  extendGetContent: req => {
    const grounds = needsGroundReasons(req) ? groundsNeedingReasons(readClaim(req)) : [];
    return grounds.length > 0 ? { backUrl: reasonUrl(req, grounds[grounds.length - 1]) } : {};
  },
});
