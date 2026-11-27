import { readClaim } from '../claimDraft';
import { PERIOD_NOT_FOUND } from '../claimMapping';
import { createMakeAClaimStep } from '../formStep';
import { rentStatementTable } from '../rentTables';

import { getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'rent-statement',
  stepDir: __dirname,
  customTemplate: 'make-a-claim/templates/rentTable.njk',
  fields: [],
  extendGetContent: (req, formContent) => {
    const t = getTranslationFunction(req, ['makeAClaim', 'common']);
    const stepT = getTranslationFunction(req);
    return {
      rentTable: readClaim(req).rentArrears?.rentHistoryTable?.length ? rentStatementTable(req, true) : undefined,
      ...(req.query?.problem === PERIOD_NOT_FOUND && !formContent.errorSummary
        ? {
            errorSummary: {
              titleText: t('makeAClaim:summary.problem'),
              errorList: [{ text: stepT('problems.periodNotFound'), href: '#rent-statement' }],
            },
          }
        : {}),
    };
  },
});
