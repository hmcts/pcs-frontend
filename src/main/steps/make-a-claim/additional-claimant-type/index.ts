import { createAdditionalClaimantStep } from '../additionalClaimantStep';
import { ORGANISATION_TYPES } from '../claimMapping';
import { radioQuestion } from '../fieldBuilders';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createAdditionalClaimantStep({
  stepName: 'additional-claimant-type',
  stepDir: __dirname,
  fields: [radioQuestion('individualOrOrganisation', ORGANISATION_TYPES)],
  previous: () => 'multiple-claimants',
  next: claimant =>
    claimant?.individualOrOrganisation === 'ORGANISATION'
      ? 'additional-claimant-organisation-name'
      : 'additional-claimant-name',
});
