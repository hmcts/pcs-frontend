import { additionalClaimantUrl } from '../additionalClaimantStep';
import { readClaim } from '../claimDraft';
import { nextAdditionalClaimantIndex } from '../claimMapping';
import { yesNoQuestion } from '../fieldBuilders';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'multiple-claimants',
  stepDir: __dirname,
  fields: [yesNoQuestion('multipleClaimants')],
  resolveRedirectAfterPost: async req =>
    req.body?.multipleClaimants === 'yes'
      ? additionalClaimantUrl(req, 'additional-claimant-type', nextAdditionalClaimantIndex(readClaim(req)))
      : undefined,
});
