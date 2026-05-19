import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { hasAnyRentArrearsGround } from '../../utils';
import { buildSectionCyaRows as buildStartNowRows } from '../check-your-answers-start-now-and-details/buildSectionCyaRows';
import { buildSectionCyaRows as buildDocumentsRows } from '../check-your-answers-documents/buildSectionCyaRows';
import { buildSectionCyaRows as buildIncomeRows } from '../check-your-answers-income-and-expenses/buildSectionCyaRows';
import { buildSectionCyaRows as buildPaymentsRows } from '../check-your-answers-payments-and-agreements/buildSectionCyaRows';
import { buildSectionCyaRows as buildPersonalRows } from '../check-your-answers-personal-details/buildSectionCyaRows';
import { escapeWithLineBreaks, getValidatedCase, isYes, makeYesNoNotSure, type SummaryListRow } from '../section-cya/cyaRow';
import { buildSectionCyaRows as buildCircumstancesRows } from '../check-your-answers-your-circumstances/buildSectionCyaRows';
import { buildSectionCyaRows as buildResponseRows } from '../check-your-answers-your-response/buildSectionCyaRows';

import { getTranslationFunction } from '@modules/steps';

export type EndOfJourneyCyaSection = {
  heading: string;
  rows: SummaryListRow[];
};

function buildOtherConsiderationsRows(req: Request, t: TFunction): SummaryListRow[] {
  const validatedCase = getValidatedCase(req);
  const caseRef = validatedCase?.id;
  if (!validatedCase || !caseRef) return [];

  const responses = validatedCase.defendantResponses ?? {};
  if (!responses.otherConsiderations) return [];

  const detail = responses.otherConsiderationsDetails?.trim();
  const rows: SummaryListRow[] = [
    {
      key: { text: t('rows.otherConsiderations.label') },
      value: { text: makeYesNoNotSure(t)(responses.otherConsiderations) },
      actions: {
        items: [
          {
            href: `/case/${caseRef}/respond-to-claim/other-considerations`,
            text: t('change'),
            visuallyHiddenText: t('rows.otherConsiderations.changeHidden'),
          },
        ],
      },
    },
  ];

  if (isYes(responses.otherConsiderations) && detail) {
    rows.push({
      key: { text: t('rows.otherConsiderationsDetails.label') },
      value: { html: escapeWithLineBreaks(detail) },
      actions: {
        items: [
          {
            href: `/case/${caseRef}/respond-to-claim/other-considerations`,
            text: t('change'),
            visuallyHiddenText: t('rows.otherConsiderationsDetails.changeHidden'),
          },
        ],
      },
    });
  }

  return rows;
}

function buildLanguageUsedRows(req: Request, t: TFunction): SummaryListRow[] {
  const validatedCase = getValidatedCase(req);
  const caseRef = validatedCase?.id;
  if (!validatedCase || !caseRef) {
    return [];
  }

  const languageUsed = validatedCase.defendantResponses?.languageUsed;
  return [
    {
      key: { text: t('rows.languageUsed.label') },
      value: { text: languageUsed ? t(`rows.languageUsed.options.${languageUsed}`) : t('noAnswerProvided') },
      actions: {
        items: [
          {
            href: `/case/${caseRef}/respond-to-claim/language-used`,
            text: t('change'),
            visuallyHiddenText: t('rows.languageUsed.changeHidden'),
          },
        ],
      },
    },
  ];
}

export function buildEndOfJourneyCyaSections(req: Request, t: TFunction): EndOfJourneyCyaSection[] {
  const tStartNow = getTranslationFunction(req, 'check-your-answers-start-now-and-details', ['common']);
  const tPersonal = getTranslationFunction(req, 'check-your-answers-personal-details', ['common']);
  const tResponse = getTranslationFunction(req, 'check-your-answers-your-response', ['common']);
  const tPayments = getTranslationFunction(req, 'check-your-answers-payments-and-agreements', ['common']);
  const tCircumstances = getTranslationFunction(req, 'check-your-answers-your-circumstances', ['common']);
  const tIncome = getTranslationFunction(req, 'check-your-answers-income-and-expenses', ['common']);
  const tDocuments = getTranslationFunction(req, 'check-your-answers-documents', ['common']);

  const sections: EndOfJourneyCyaSection[] = [];

  sections.push({
    heading: t('sections.freeLegalAdvice'),
    rows: buildStartNowRows(req, tStartNow),
  });

  sections.push({
    heading: t('sections.personalDetails'),
    rows: buildPersonalRows(req, tPersonal),
  });

  const paymentsRows = hasAnyRentArrearsGround(req) ? buildPaymentsRows(req, tPayments) : [];

  sections.push({
    heading: t('sections.response'),
    rows: [...buildResponseRows(req, tResponse), ...paymentsRows],
  });

  sections.push({
    heading: t('sections.householdAndCircumstances'),
    rows: buildCircumstancesRows(req, tCircumstances),
  });

  const incomeRows = buildIncomeRows(req, tIncome).filter(
    row => !row.actions.items.some(item => item.href.includes('other-considerations'))
  );

  sections.push({
    heading: t('sections.incomeAndExpenses'),
    rows: incomeRows,
  });

  sections.push({
    heading: t('sections.otherConsiderations'),
    rows: buildOtherConsiderationsRows(req, t),
  });

  sections.push({
    heading: t('sections.documents'),
    rows: buildDocumentsRows(req, tDocuments),
  });

  sections.push({
    heading: t('sections.languageUsed'),
    rows: buildLanguageUsedRows(req, t),
  });

  return sections;
}
