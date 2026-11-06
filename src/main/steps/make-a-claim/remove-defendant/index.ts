import { readClaim } from '../claimDraft';
import { itemIndexOf } from '../claimMapping';
import { yesNoQuestion } from '../fieldBuilders';
import { flowConfig } from '../flow.config';
import { createMakeAClaimStep } from '../formStep';
import { defendantDisplayName } from '../summary';

import { getStepUrl } from '@modules/steps/flow';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'remove-defendant',
  stepDir: __dirname,
  interstitial: true,
  fields: [yesNoQuestion('confirmRemove')],
  extendGetContent: req => ({
    defendantName: defendantDisplayName(
      readClaim(req).defendants?.[itemIndexOf(req, readClaim(req).defendants, 'index') ?? -1]?.value,
      req
    ),
    backUrl: getStepUrl('defendant-cya', flowConfig, req.res?.locals.validatedCase?.id),
  }),
  resolveRedirectAfterPost: async req => getStepUrl('defendant-cya', flowConfig, req.res?.locals.validatedCase?.id),
});
