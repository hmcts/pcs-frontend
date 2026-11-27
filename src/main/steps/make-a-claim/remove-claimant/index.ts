import { createRemoveItemStep } from '../removeItemStep';
import { additionalClaimantDisplayName } from '../summary';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRemoveItemStep({
  stepName: 'remove-claimant',
  stepDir: __dirname,
  summaryStep: 'claimant-cya',
  items: claim => claim.additionalClaimants,
  nameKey: 'claimantName',
  displayName: additionalClaimantDisplayName,
});
