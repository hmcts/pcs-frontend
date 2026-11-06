import { readClaim } from '../claimDraft';
import { yesNoQuestion } from '../fieldBuilders';
import { flowConfig } from '../flow.config';
import { createMakeAClaimStep } from '../formStep';
import { defendantDisplayName } from '../summary';

import { getStepUrl } from '@modules/steps/flow';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'additional-defendants',
  stepDir: __dirname,
  fields: [yesNoQuestion('additionalDefendants')],
  extendGetContent: req => ({
    listItems: (readClaim(req).defendants ?? []).map(defendant => defendantDisplayName(defendant.value, req)),
  }),
  resolveRedirectAfterPost: async req => {
    if (req.body?.additionalDefendants !== 'yes') {
      return undefined;
    }
    const next = readClaim(req).defendants?.length ?? 1;
    return `${getStepUrl('defendant-name', flowConfig, req.res?.locals.validatedCase?.id)}?index=${next}`;
  },
});
