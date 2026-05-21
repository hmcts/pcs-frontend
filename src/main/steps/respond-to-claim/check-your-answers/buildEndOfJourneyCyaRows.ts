import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { hasAnyRentArrearsGround } from '../../utils';
import { buildSectionCyaRows as buildDocumentsRows } from '../check-your-answers-documents/buildSectionCyaRows';
import {
  buildSectionCyaRows as buildIncomeRows,
  buildOtherConsiderationsRows,
} from '../check-your-answers-income-and-expenses/buildSectionCyaRows';
import { buildSectionCyaRows as buildPaymentsRows } from '../check-your-answers-payments-and-agreements/buildSectionCyaRows';
import { buildSectionCyaRows as buildPersonalRows } from '../check-your-answers-personal-details/buildSectionCyaRows';
import { buildSectionCyaRows as buildStartNowRows } from '../check-your-answers-start-now-and-details/buildSectionCyaRows';
import { buildSectionCyaRows as buildCircumstancesRows } from '../check-your-answers-your-circumstances/buildSectionCyaRows';
import { buildSectionCyaRows as buildResponseRows } from '../check-your-answers-your-response/buildSectionCyaRows';
import { type SummaryListRow } from '../section-cya/cyaRow';

import { buildLanguageUsedRows } from './buildLanguageUsedRows';

import { getTranslationFunction } from '@modules/steps';

export type EndOfJourneyCyaSection = {
  heading: string;
  rows: SummaryListRow[];
};

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
