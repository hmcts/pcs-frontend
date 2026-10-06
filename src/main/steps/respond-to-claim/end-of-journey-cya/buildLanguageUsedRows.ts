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
  const canChange = req.res?.locals.welshEnabled === true;

  // With the question switched off there is nothing to change; show an earlier answer if there is one.
  if (!canChange && !languageUsed) {
    return [];
  }

  return [
    {
      key: { text: t('rows.languageUsed.label') },
      value: { text: languageUsed ? t(`rows.languageUsed.options.${languageUsed}`) : t('noAnswerProvided') },
      ...(canChange ? { actions: { items: [change('language-used', 'rows.languageUsed.changeHidden')] } } : {}),
    },
  ];
}
