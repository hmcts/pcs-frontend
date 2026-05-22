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
import {
  buildCircumstancesOnlyRows,
  buildDependantsRows,
} from '../check-your-answers-your-circumstances/buildSectionCyaRows';
import { buildSectionCyaRows as buildResponseRows } from '../check-your-answers-your-response/buildSectionCyaRows';
import { type SummaryListRow, getValidatedCase } from '../section-cya/cyaRow';

import { buildLanguageUsedRows } from './buildLanguageUsedRows';

import { getTranslationFunction } from '@modules/steps';

export type EndOfJourneyCyaSection = {
  heading: string;
  rows: SummaryListRow[];
};

export function buildEndOfJourneyCyaSections(req: Request, t: TFunction): EndOfJourneyCyaSection[] {
  const tPersonal = getTranslationFunction(req, ['respondToClaim/checkYourAnswersPersonalDetails', 'common']);
  const tResponse = getTranslationFunction(req, ['respondToClaim/checkYourAnswersYourResponse', 'common']);
  const tPayments = getTranslationFunction(req, ['respondToClaim/checkYourAnswersPaymentsAndAgreements', 'common']);
  const tCircumstances = getTranslationFunction(req, ['respondToClaim/checkYourAnswersYourCircumstances', 'common']);
  const tIncome = getTranslationFunction(req, ['respondToClaim/checkYourAnswersIncomeAndExpenses', 'common']);
  const tDocuments = getTranslationFunction(req, ['respondToClaim/checkYourAnswersDocuments', 'common']);

  const claimantName = getValidatedCase(req)?.claimantName ?? '';
  const sections: EndOfJourneyCyaSection[] = [];

  sections.push({
    heading: t('sections.personalDetails'),
    rows: buildPersonalRows(req, tPersonal),
  });

  const paymentsRows = hasAnyRentArrearsGround(req) ? buildPaymentsRows(req, tPayments) : [];

  sections.push({
    heading: t('sections.claimantsClaim', { claimantName }),
    rows: [...buildResponseRows(req, tResponse), ...paymentsRows],
  });

  sections.push({
    heading: t('sections.dependantsAndOtherResidents'),
    rows: buildDependantsRows(req, tCircumstances),
  });

  sections.push({
    heading: t('sections.yourCircumstances'),
    rows: buildCircumstancesOnlyRows(req, tCircumstances),
  });

  const incomeRows = buildIncomeRows(req, tIncome).filter(
    row => !row.actions.items.some(item => item.href.includes('other-considerations'))
  );

  sections.push({
    heading: t('sections.incomeAndExpenses'),
    rows: incomeRows,
  });

  sections.push({
    heading: t('sections.uploadFiles'),
    rows: buildDocumentsRows(req, tDocuments),
  });

  sections.push({
    heading: t('sections.otherConsiderations'),
    rows: buildOtherConsiderationsRows(req, t),
  });

  sections.push({
    heading: t('sections.languageUsed'),
    rows: buildLanguageUsedRows(req, t),
  });

  return sections.map(section => ({
    ...section,
    rows: section.rows.map(row => ({
      ...row,
      actions: {
        items: row.actions.items.map(item => ({ ...item, href: `${item.href}&cyaReturn=1` })),
      },
    })),
  }));
}
