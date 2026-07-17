import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { type SummaryListRow, getValidatedCase, makeChange } from '../section-cya/cyaRow';

export function buildLanguageUsedRows(req: Request, t: TFunction): SummaryListRow[] {
  const validatedCase = getValidatedCase(req);
  const caseRef = validatedCase?.id;
  if (!validatedCase || !caseRef) {
    return [];
  }

  const change = makeChange(caseRef, 'checkYourAnswersAndSubmit', t);
  const languageUsed = validatedCase.defendantResponses?.languageUsed;

  return [
    {
      key: { text: t('rows.languageUsed.label') },
      value: { text: languageUsed ? t(`rows.languageUsed.options.${languageUsed}`) : t('noAnswerProvided') },
      actions: { items: [change('language-used', 'rows.languageUsed.changeHidden')] },
    },
  ];
}
