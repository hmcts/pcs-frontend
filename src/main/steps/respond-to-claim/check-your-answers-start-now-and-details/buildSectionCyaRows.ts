import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { type SummaryListRow, getValidatedCase, makeChange } from '../section-cya/cyaRow';
import type { RespondToClaimSectionId } from '../sections.config';

const SECTION_ID: RespondToClaimSectionId = 'startNowAndDetails';

export function buildSectionCyaRows(req: Request, t: TFunction): SummaryListRow[] {
  const validatedCase = getValidatedCase(req);
  const caseRef = validatedCase?.id;
  if (!validatedCase || !caseRef) {
    return [];
  }
  const value = validatedCase.defendantResponsesFreeLegalAdvice;
  const change = makeChange(caseRef, SECTION_ID, t);

  const rows: SummaryListRow[] = [];

  if (value) {
    rows.push({
      key: { text: t('rows.freeLegalAdvice.label') },
      value: { text: t(`rows.freeLegalAdvice.options.${value}`) },
      actions: {
        items: [change('free-legal-advice', 'rows.freeLegalAdvice.changeHidden')],
      },
    });
  }

  return rows;
}
