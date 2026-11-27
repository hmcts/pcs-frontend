import { createAdditionalClaimantStep } from '../additionalClaimantStep';
import { ADDRESS_TEMPLATE, addressContent, addressFields } from '../addressFields';
import { ADDITIONAL_CLAIMANT_ADDRESS } from '../claimMapping';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createAdditionalClaimantStep({
  stepName: 'additional-claimant-address',
  stepDir: __dirname,
  customTemplate: ADDRESS_TEMPLATE,
  fields: addressFields(ADDITIONAL_CLAIMANT_ADDRESS),
  extendGetContent: (req, formContent) => addressContent(req, ADDITIONAL_CLAIMANT_ADDRESS, formContent),
  previous: claimant =>
    claimant?.individualOrOrganisation === 'ORGANISATION'
      ? 'additional-claimant-organisation-name'
      : 'additional-claimant-name',
  next: () => 'additional-claimant-email',
});
