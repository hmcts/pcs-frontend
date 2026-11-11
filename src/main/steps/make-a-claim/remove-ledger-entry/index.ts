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
  redirectWhen: req =>
    itemIndexOf(req, readClaim(req).rentArrears?.rentHistoryLedger, 'entry') === undefined
      ? getStepUrl('ledger-summary', flowConfig, req.res?.locals.validatedCase?.id)
      : undefined,
  extendGetContent: req => {
    const ledger = readClaim(req).rentArrears?.rentHistoryLedger;
    const entry = ledger?.[itemIndexOf(req, ledger, 'entry') ?? -1]?.value;
    const ledgerSummaryUrl = getStepUrl('ledger-summary', flowConfig, req.res?.locals.validatedCase?.id);
    return {
      transactionDate: formatClaimDate(entry?.transactionDate, req),
      backUrl: ledgerSummaryUrl,
      dashboardUrl: ledgerSummaryUrl,
    };
  },
  resolveRedirectAfterPost: async req => getStepUrl('ledger-summary', flowConfig, req.res?.locals.validatedCase?.id),
});
