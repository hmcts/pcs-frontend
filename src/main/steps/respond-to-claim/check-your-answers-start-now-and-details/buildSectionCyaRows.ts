import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { type SummaryListRow, createRowContext } from '../section-cya/cyaRow';
import type { RespondToClaimSectionId } from '../sections.config';

const SECTION_ID: RespondToClaimSectionId = 'startNowAndDetails';

export function buildSectionCyaRows(req: Request, t: TFunction): SummaryListRow[] {
  const ctx = createRowContext(req, SECTION_ID, t);
  if (!ctx) {
    return [];
  }
  const { rows, validatedCase, change } = ctx;
  const value = validatedCase.defendantResponsesFreeLegalAdvice;

  if (value) {
    rows.push({
      key: { text: t('rows.freeLegalAdvice.label') },
      value: { text: t(`rows.freeLegalAdvice.options.${value}`) },
      actions: {
        items: [change('free-legal-advice', 'rows.freeLegalAdvice.changeHidden')],
      },
    });
  }

  const hasSolicitor = validatedCase.defendantResponses?.hasSolicitor;

  if (hasSolicitor) {
    rows.push({
      key: { text: t('rows.hasSolicitor.label') },
      value: { text: t(`rows.hasSolicitor.options.${hasSolicitor}`) },
      actions: {
        items: [change('solicitor', 'rows.hasSolicitor.changeHidden')],
      },
    });
  }

  return rows;
}
