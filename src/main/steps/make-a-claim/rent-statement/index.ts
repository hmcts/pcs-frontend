import { readClaim } from '../claimDraft';
import { createMakeAClaimStep } from '../formStep';
import { formatPence, rentTableWithArrears } from '../rentHistory';
import { rentStatementTable } from '../rentTables';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'rent-statement',
  stepDir: __dirname,
  customTemplate: 'make-a-claim/templates/rentTable.njk',
  fields: [],
  extendGetContent: req => {
    const lines = rentTableWithArrears(readClaim(req).rentArrears?.rentHistoryTable);
    return {
      rentTable: lines.length > 0 ? rentStatementTable(req, true) : undefined,
      totalArrears: lines.length > 0 ? formatPence(lines[lines.length - 1].arrears) : undefined,
    };
  },
});
