import { readClaim } from '../claimDraft';
import { itemIndexOf } from '../claimMapping';
import { yesNoQuestion } from '../fieldBuilders';
import { flowConfig } from '../flow.config';
import { createMakeAClaimStep } from '../formStep';
import { additionalClaimantDisplayName } from '../summary';

import { getStepUrl } from '@modules/steps/flow';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'remove-claimant',
  stepDir: __dirname,
  interstitial: true,
  fields: [yesNoQuestion('confirmRemove')],
  redirectWhen: req =>
    itemIndexOf(req, readClaim(req).additionalClaimants, 'index') === undefined
      ? getStepUrl('claimant-cya', flowConfig, req.res?.locals.validatedCase?.id)
      : undefined,
  extendGetContent: req => {
    const claimants = readClaim(req).additionalClaimants;
    const index = itemIndexOf(req, claimants, 'index') ?? -1;
    return {
      claimantName: additionalClaimantDisplayName(claimants?.[index]?.value, index, req),
      backUrl: getStepUrl('claimant-cya', flowConfig, req.res?.locals.validatedCase?.id),
    };
  },
  resolveRedirectAfterPost: async req => getStepUrl('claimant-cya', flowConfig, req.res?.locals.validatedCase?.id),
});
