import { readClaim } from '../claimDraft';
import { formatClaimDate } from '../dates';
import { yesNoQuestion } from '../fieldBuilders';
import { flowConfig } from '../flow.config';
import { createMakeAClaimStep } from '../formStep';
import { indexFromQuery } from '../formValues';

import { getStepUrl } from '@modules/steps/flow';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'remove-ledger-entry',
  stepDir: __dirname,
  interstitial: true,
  fields: [yesNoQuestion('confirmRemove')],
  extendGetContent: req => {
    const entry = readClaim(req).rentArrears?.rentHistoryLedger?.[indexFromQuery(req.query?.entry) ?? -1]?.value;
    return {
      transactionDate: formatClaimDate(entry?.transactionDate, req),
      backUrl: getStepUrl('ledger-summary', flowConfig, req.res?.locals.validatedCase?.id),
    };
  },
  resolveRedirectAfterPost: async req => getStepUrl('ledger-summary', flowConfig, req.res?.locals.validatedCase?.id),
});
