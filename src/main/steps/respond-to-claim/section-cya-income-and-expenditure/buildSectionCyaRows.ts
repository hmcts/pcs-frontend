import escapeHtml from 'escape-html';
import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { formatIsoDate, penceToPounds } from '../../utils';

import type { HouseholdCircumstances } from '@services/ccdCase.interface';
import type { CcdCaseModel } from '@services/ccdCaseData.model';

const SECTION_ID = 'incomeAndExpenditure';

export type SummaryListRow = {
  key: { text: string };
  value: { text?: string; html?: string };
  actions: { items: { href: string; text: string; visuallyHiddenText: string }[] };
};

function escapeWithLineBreaks(value: string): string {
  return escapeHtml(value).replace(/\n/g, '<br>');
}

const isYes = (value?: string | null): boolean => (value ?? '').trim().toUpperCase() === 'YES';

// Income sources captured on what-regular-income-do-you-receive. Each (bar
// moneyFromElsewhere) carries an amount + frequency; moneyFromElsewhere carries
// free text instead.
const INCOME_SOURCES = [
  { key: 'incomeFromJobs', amount: 'incomeFromJobsAmount', frequency: 'incomeFromJobsFrequency' },
  { key: 'pension', amount: 'pensionAmount', frequency: 'pensionFrequency' },
  { key: 'universalCredit', amount: 'universalCreditAmount', frequency: 'universalCreditFrequency' },
  { key: 'otherBenefits', amount: 'otherBenefitsAmount', frequency: 'otherBenefitsFrequency' },
] as const;

// Regular expense categories captured on what-other-regular-expenses-do-you-have.
const EXPENSE_KEYS = [
  'householdBills',
  'loanPayments',
  'childSpousalMaintenance',
  'mobilePhone',
  'groceryShopping',
  'fuelParkingTransport',
  'schoolCosts',
  'clothing',
  'otherExpenses',
] as const;

export function buildSectionCyaRows(req: Request, t: TFunction): SummaryListRow[] {
  const validatedCase = req.res?.locals.validatedCase as CcdCaseModel | undefined;
  const caseRef = validatedCase?.id;
  if (!validatedCase || !caseRef) {
    return [];
  }

  const responses = validatedCase.defendantResponses ?? {};
  const hc: HouseholdCircumstances = responses.householdCircumstances ?? {};

  const change = (stepSlug: string, hiddenKey: string) => ({
    href: `/case/${caseRef}/respond-to-claim/${stepSlug}?edit=${SECTION_ID}`,
    text: t('change'),
    visuallyHiddenText: t(hiddenKey),
  });

  const yesNo = (value: string): string => t(`options.${value.trim().toUpperCase()}`);

  // "£12.34 a week" — amount is stored in pence, frequency is WEEKLY/MONTHLY.
  const amountWithFrequency = (amount?: string | null, frequency?: string | null): string => {
    const pounds = penceToPounds(amount ?? undefined);
    const money = pounds ? `£${pounds}` : '';
    const freq = frequency ? t(`frequencies.${String(frequency).trim().toUpperCase()}`) : '';
    return [money, freq].filter(Boolean).join(' ');
  };

  const listHtml = (items: string[]): string =>
    `<ul class="govuk-list">\n${items.map(item => `<li>${item}</li>`).join('\n')}\n</ul>`;

  const rows: SummaryListRow[] = [];

  // Provide finance details — the gate for the rest of the section. The normaliser
  // keeps this field even when the answer is "No" (it only drops the branch below).
  if (hc.shareIncomeExpenseDetails) {
    rows.push({
      key: { text: t('rows.shareIncomeExpenseDetails.label') },
      value: { text: yesNo(hc.shareIncomeExpenseDetails) },
      actions: { items: [change('income-and-expenses', 'rows.shareIncomeExpenseDetails.changeHidden')] },
    });
  }

  // Regular income — shown whenever the user opted into finance details
  // (shareIncomeExpenseDetails === YES is the showCondition for this step). The
  // page is optional, so an empty selection is still an answer — render "No
  // answer provided" rather than dropping the row, keeping the question and its
  // Change link visible on the CYA.
  if (isYes(hc.shareIncomeExpenseDetails)) {
    const incomeItems: string[] = [];
    for (const source of INCOME_SOURCES) {
      if (isYes(hc[source.key])) {
        const label = t(`rows.regularIncome.options.${source.key}`);
        const detail = amountWithFrequency(hc[source.amount], hc[source.frequency]);
        incomeItems.push(detail ? `${escapeHtml(label)}: ${escapeHtml(detail)}` : escapeHtml(label));
      }
    }
    if (isYes(hc.moneyFromElsewhere)) {
      const label = t('rows.regularIncome.options.moneyFromElsewhere');
      const detail = hc.moneyFromElsewhereDetails?.trim();
      incomeItems.push(detail ? `${escapeHtml(label)}: ${escapeWithLineBreaks(detail)}` : escapeHtml(label));
    }
    rows.push({
      key: { text: t('rows.regularIncome.label') },
      value: incomeItems.length > 0 ? { html: listHtml(incomeItems) } : { text: t('noAnswerProvided') },
      actions: { items: [change('what-regular-income-do-you-receive', 'rows.regularIncome.changeHidden')] },
    });
  }

  // Applied for Universal Credit — the step is skipped (and the field absent) when
  // the defendant is already on Universal Credit, so a presence check is correct.
  if (hc.hasAppliedForUniversalCredit) {
    const value =
      isYes(hc.hasAppliedForUniversalCredit) && hc.ucApplicationDate
        ? { text: `${yesNo(hc.hasAppliedForUniversalCredit)} (${formatIsoDate(hc.ucApplicationDate)})` }
        : { text: yesNo(hc.hasAppliedForUniversalCredit) };
    rows.push({
      key: { text: t('rows.hasAppliedForUniversalCredit.label') },
      value,
      actions: {
        items: [change('have-you-applied-for-universal-credit', 'rows.hasAppliedForUniversalCredit.changeHidden')],
      },
    });
  }

  // Priority debts — Yes/No.
  if (hc.priorityDebts) {
    rows.push({
      key: { text: t('rows.priorityDebts.label') },
      value: { text: yesNo(hc.priorityDebts) },
      actions: { items: [change('priority-debts', 'rows.priorityDebts.changeHidden')] },
    });
  }

  // Priority debt details — only present when priorityDebts === YES (the normaliser
  // drops these fields otherwise). Amounts are stored in pence.
  if (hc.debtTotal || hc.debtContribution) {
    const detailItems: string[] = [];
    const totalPounds = penceToPounds(hc.debtTotal);
    if (totalPounds) {
      detailItems.push(`${escapeHtml(t('rows.priorityDebtDetails.total'))}: £${totalPounds}`);
    }
    const contribution = amountWithFrequency(hc.debtContribution, hc.debtContributionFrequency);
    if (contribution) {
      detailItems.push(`${escapeHtml(t('rows.priorityDebtDetails.contribution'))}: ${escapeHtml(contribution)}`);
    }
    if (detailItems.length > 0) {
      rows.push({
        key: { text: t('rows.priorityDebtDetails.label') },
        value: { html: listHtml(detailItems) },
        actions: { items: [change('priority-debt-details', 'rows.priorityDebtDetails.changeHidden')] },
      });
    }
  }

  // Other regular expenses — same optional-multi-select handling as regular
  // income: shown whenever finance details were opted into, "No answer provided"
  // when the (optional) page was left empty.
  if (isYes(hc.shareIncomeExpenseDetails)) {
    const expenseItems: string[] = [];
    for (const key of EXPENSE_KEYS) {
      const details = hc[key];
      if (details && isYes(details.applies)) {
        const label = t(`rows.regularExpenses.options.${key}`);
        const detail = amountWithFrequency(details.amount, details.frequency);
        expenseItems.push(detail ? `${escapeHtml(label)}: ${escapeHtml(detail)}` : escapeHtml(label));
      }
    }
    rows.push({
      key: { text: t('rows.regularExpenses.label') },
      value: expenseItems.length > 0 ? { html: listHtml(expenseItems) } : { text: t('noAnswerProvided') },
      actions: {
        items: [change('what-other-regular-expenses-do-you-have', 'rows.regularExpenses.changeHidden')],
      },
    });
  }

  // Other considerations — always shown; stored on defendantResponses, not householdCircumstances.
  if (responses.otherConsiderations) {
    const detail = responses.otherConsiderationsDetails?.trim();
    const value =
      isYes(responses.otherConsiderations) && detail
        ? { html: `${escapeHtml(yesNo(responses.otherConsiderations))}<br><br>${escapeWithLineBreaks(detail)}` }
        : { text: yesNo(responses.otherConsiderations) };
    rows.push({
      key: { text: t('rows.otherConsiderations.label') },
      value,
      actions: { items: [change('other-considerations', 'rows.otherConsiderations.changeHidden')] },
    });
  }

  return rows;
}
