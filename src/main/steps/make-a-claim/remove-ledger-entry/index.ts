import { readClaim } from '../claimDraft';
import { itemIndexOf } from '../claimMapping';
import { formatClaimDate } from '../dates';
import { yesNoQuestion } from '../fieldBuilders';
import { flowConfig } from '../flow.config';
import { createMakeAClaimStep } from '../formStep';

import { getStepUrl } from '@modules/steps/flow';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'remove-ledger-entry',
  stepDir: __dirname,
  interstitial: true,
  fields: [yesNoQuestion('confirmRemove')],
  extendGetContent: req => {
    const ledger = readClaim(req).rentArrears?.rentHistoryLedger;
    const entry = ledger?.[itemIndexOf(req, ledger, 'entry') ?? -1]?.value;
    return {
      transactionDate: formatClaimDate(entry?.transactionDate, req),
      backUrl: getStepUrl('ledger-summary', flowConfig, req.res?.locals.validatedCase?.id),
    };
  },
  resolveRedirectAfterPost: async req => getStepUrl('ledger-summary', flowConfig, req.res?.locals.validatedCase?.id),
});
