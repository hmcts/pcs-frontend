import type { Request } from 'express';
import type { TFunction } from 'i18next';

const SECTION_ID = 'startNowAndDetails';

export type SummaryListRow = {
  key: { text: string };
  value: { text: string };
  actions: { items: { href: string; text: string; visuallyHiddenText: string }[] };
};

export function buildSectionCyaRows(req: Request, t: TFunction): SummaryListRow[] {
  const caseRef = req.res?.locals.validatedCase?.id;
  const validatedCase = req.res?.locals.validatedCase as
    | { defendantResponses?: { freeLegalAdvice?: string } }
    | undefined;
  const value = validatedCase?.defendantResponses?.freeLegalAdvice;

  const rows: SummaryListRow[] = [];

  if (value) {
    rows.push({
      key: { text: t('rows.freeLegalAdvice.label') },
      value: { text: t(`rows.freeLegalAdvice.options.${value}`) },
      actions: {
        items: [
          {
            href: `/case/${caseRef}/respond-to-claim/free-legal-advice?edit=${SECTION_ID}`,
            text: t('change'),
            visuallyHiddenText: t('rows.freeLegalAdvice.changeHidden'),
          },
        ],
      },
    });
  }

  return rows;
}
