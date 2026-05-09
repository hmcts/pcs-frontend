import type { Request } from 'express';
import type { TFunction } from 'i18next';

const SECTION_ID = 'personalDetails';

export type SummaryListRow = {
  key: { text: string };
  value: { text: string };
  actions: { items: { href: string; text: string; visuallyHiddenText: string }[] };
};

export function buildSectionCyaRows(req: Request, t: TFunction): SummaryListRow[] {
  const caseRef = req.res?.locals.validatedCase?.id;
  const validatedCase = req.res?.locals.validatedCase as
    | { defendantResponses?: { defendantNameConfirmation?: string } }
    | undefined;
  const responses = validatedCase?.defendantResponses;

  const rows: SummaryListRow[] = [];

  if (responses?.defendantNameConfirmation) {
    rows.push({
      key: { text: t('rows.defendantNameConfirmation.label') },
      value: { text: t(`rows.defendantNameConfirmation.options.${responses.defendantNameConfirmation}`) },
      actions: {
        items: [
          {
            href: `/case/${caseRef}/respond-to-claim/defendant-name-confirmation?edit=${SECTION_ID}`,
            text: t('change'),
            visuallyHiddenText: t('rows.defendantNameConfirmation.changeHidden'),
          },
        ],
      },
    });
  }

  return rows;
}
