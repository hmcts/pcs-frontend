import { readClaim } from '../claimDraft';
import { needsGroundReasons } from '../conditions';
import { createMakeAClaimStep, isRendering } from '../formStep';
import { reasonUrl } from '../ground-reason';
import { tenancyCard } from '../summary';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { groundsNeedingReasons } from '@services/citizenPossessionClaim.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'tenancy-cya',
  stepDir: __dirname,
  customTemplate: 'make-a-claim/templates/summary.njk',
  fields: [],
  extendGetContent: (req, formContent) => {
    const grounds = needsGroundReasons(req) ? groundsNeedingReasons(readClaim(req).grounds) : [];
    return {
      ...(isRendering(formContent) ? { cards: [tenancyCard(req)] } : {}),
      ...(grounds.length > 0 ? { backUrl: reasonUrl(req, grounds[grounds.length - 1]) } : {}),
    };
  },
});
