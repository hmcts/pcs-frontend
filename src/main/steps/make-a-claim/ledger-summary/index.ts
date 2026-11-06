import { readClaim } from '../claimDraft';
import { yesNoQuestion } from '../fieldBuilders';
import { flowConfig } from '../flow.config';
import { createMakeAClaimStep } from '../formStep';
import { formatPence, ledgerWithArrears } from '../rentHistory';
import { ledgerTable } from '../rentTables';

import { getStepUrl } from '@modules/steps/flow';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'ledger-summary',
  stepDir: __dirname,
  customTemplate: 'make-a-claim/templates/rentTable.njk',
  fields: [yesNoQuestion('addAnother', { isPageHeading: false, legendClasses: 'govuk-fieldset__legend--m' })],
  extendGetContent: req => {
    const lines = ledgerWithArrears(readClaim(req).rentArrears?.rentHistoryLedger);
    return {
      rentTable: lines.length > 0 ? ledgerTable(req, true) : undefined,
      totalArrears: lines.length > 0 ? formatPence(lines[lines.length - 1].arrears) : undefined,
    };
  },
  resolveRedirectAfterPost: async req => {
    const entries = readClaim(req).rentArrears?.rentHistoryLedger?.length ?? 0;
    if (req.body?.addAnother === 'yes' || entries === 0) {
      return `${getStepUrl('ledger-transaction', flowConfig, req.res?.locals.validatedCase?.id)}?entry=${entries}`;
    }
    return undefined;
  },
});
