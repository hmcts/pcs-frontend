import escapeHtml from 'escape-html';
import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { formatIsoDate, penceToPounds } from '../../utils';
import {
  type SummaryListRow,
  escapeWithLineBreaks,
  getValidatedCase,
  isYes,
  listHtml,
  makeChange,
  makeYesNoNotSure,
} from '../section-cya/cyaRow';
import type { RespondToClaimSectionId } from '../sections.config';

import type { CcdDefendantResponses, HouseholdCircumstances } from '@services/ccdCase.interface';

const SECTION_ID: RespondToClaimSectionId = 'incomeAndExpenditure';

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

interface RowContext {
  rows: SummaryListRow[];
  responses: CcdDefendantResponses;
  hc: HouseholdCircumstances;
  t: TFunction;
  change: ReturnType<typeof makeChange>;
  yesNoNotSure: ReturnType<typeof makeYesNoNotSure>;
}

export function buildSectionCyaRows(req: Request, t: TFunction): SummaryListRow[] {
  const validatedCase = getValidatedCase(req);
  const caseRef = validatedCase?.id;
  if (!validatedCase || !caseRef) {
    return [];
  }

  const responses = validatedCase.defendantResponses ?? {};
  const ctx: RowContext = {
    rows: [],
    responses,
    hc: responses.householdCircumstances ?? {},
    t,
    change: makeChange(caseRef, SECTION_ID, t),
    yesNoNotSure: makeYesNoNotSure(t),
  };

  addShareIncomeExpenseDetailsRow(ctx);
  addRegularIncomeRow(ctx);
  addAppliedForUcRow(ctx);
  addPriorityDebtsRow(ctx);
  addPriorityDebtDetailsRow(ctx);
  addRegularExpensesRow(ctx);
  addOtherConsiderationsRow(ctx);

  return ctx.rows;
}

function amountWithFrequency(
  amount: string | null | undefined,
  frequency: string | null | undefined,
  t: TFunction
): string {
  const pounds = penceToPounds(amount ?? undefined);
  const money = pounds ? `£${pounds}` : '';
  const freq = frequency ? t(`frequencies.${String(frequency).trim().toUpperCase()}`) : '';
  return [money, freq].filter(Boolean).join(' ');
}

function addShareIncomeExpenseDetailsRow({ rows, hc, t, change, yesNoNotSure }: RowContext): void {
  // The gate for the rest of the section. The normaliser keeps this field even
  // when the answer is "No" (it only drops the branch below).
  if (!hc.shareIncomeExpenseDetails) {
    return;
  }
  rows.push({
    key: { text: t('rows.shareIncomeExpenseDetails.label') },
    value: { text: yesNoNotSure(hc.shareIncomeExpenseDetails) },
    actions: { items: [change('income-and-expenses', 'rows.shareIncomeExpenseDetails.changeHidden')] },
  });
}

function addRegularIncomeRow({ rows, hc, t, change }: RowContext): void {
  // Shown whenever the user opted into finance details (shareIncomeExpenseDetails === YES
  // is the showCondition for this step). The page is optional, so an empty selection is
  // still an answer — render "No answer provided" rather than dropping the row, keeping
  // the question and its Change link visible on the CYA.
  if (!isYes(hc.shareIncomeExpenseDetails)) {
    return;
  }
  const items: string[] = [];
  for (const source of INCOME_SOURCES) {
    if (!isYes(hc[source.key])) {
      continue;
    }
    const label = t(`rows.regularIncome.options.${source.key}`);
    const detail = amountWithFrequency(hc[source.amount], hc[source.frequency], t);
    items.push(detail ? `${escapeHtml(label)}: ${escapeHtml(detail)}` : escapeHtml(label));
  }
  if (isYes(hc.moneyFromElsewhere)) {
    const label = t('rows.regularIncome.options.moneyFromElsewhere');
    const detail = hc.moneyFromElsewhereDetails?.trim();
    items.push(detail ? `${escapeHtml(label)}: ${escapeWithLineBreaks(detail)}` : escapeHtml(label));
  }
  rows.push({
    key: { text: t('rows.regularIncome.label') },
    value: items.length > 0 ? { html: listHtml(items) } : { text: t('noAnswerProvided') },
    actions: { items: [change('what-regular-income-do-you-receive', 'rows.regularIncome.changeHidden')] },
  });
}

function addAppliedForUcRow({ rows, hc, t, change, yesNoNotSure }: RowContext): void {
  // The step is skipped (and the field absent) when the defendant is already on UC,
  // so a presence check is correct.
  if (!hc.hasAppliedForUniversalCredit) {
    return;
  }
  rows.push({
    key: { text: t('rows.hasAppliedForUniversalCredit.label') },
    value: { text: yesNoNotSure(hc.hasAppliedForUniversalCredit) },
    actions: {
      items: [change('have-you-applied-for-universal-credit', 'rows.hasAppliedForUniversalCredit.changeHidden')],
    },
  });

  if (!isYes(hc.hasAppliedForUniversalCredit) || !hc.ucApplicationDate) {
    return;
  }
  rows.push({
    key: { text: t('rows.universalCreditApplicationDate.label') },
    value: { text: formatIsoDate(hc.ucApplicationDate) },
    actions: {
      items: [change('have-you-applied-for-universal-credit', 'rows.universalCreditApplicationDate.changeHidden')],
    },
  });
}

function addPriorityDebtsRow({ rows, hc, t, change, yesNoNotSure }: RowContext): void {
  if (!hc.priorityDebts) {
    return;
  }
  rows.push({
    key: { text: t('rows.priorityDebts.label') },
    value: { text: yesNoNotSure(hc.priorityDebts) },
    actions: { items: [change('priority-debts', 'rows.priorityDebts.changeHidden')] },
  });
}

function addPriorityDebtDetailsRow({ rows, hc, t, change }: RowContext): void {
  // Only present when priorityDebts === YES (the normaliser drops these fields
  // otherwise). Amounts are stored in pence.
  if (!hc.debtTotal && !hc.debtContribution) {
    return;
  }
  const items: string[] = [];
  const totalPounds = penceToPounds(hc.debtTotal);
  if (totalPounds) {
    items.push(`${escapeHtml(t('rows.priorityDebtDetails.total'))}: £${totalPounds}`);
  }
  const contribution = amountWithFrequency(hc.debtContribution, hc.debtContributionFrequency, t);
  if (contribution) {
    items.push(`${escapeHtml(t('rows.priorityDebtDetails.contribution'))}: ${escapeHtml(contribution)}`);
  }
  if (items.length === 0) {
    return;
  }
  rows.push({
    key: { text: t('rows.priorityDebtDetails.label') },
    value: { html: listHtml(items) },
    actions: { items: [change('priority-debt-details', 'rows.priorityDebtDetails.changeHidden')] },
  });
}

function addRegularExpensesRow({ rows, hc, t, change }: RowContext): void {
  // Same optional-multi-select handling as regular income: shown whenever finance
  // details were opted into, "No answer provided" when the (optional) page was empty.
  if (!isYes(hc.shareIncomeExpenseDetails)) {
    return;
  }
  const items: string[] = [];
  for (const key of EXPENSE_KEYS) {
    const details = hc[key];
    if (!details || !isYes(details.applies)) {
      continue;
    }
    const label = t(`rows.regularExpenses.options.${key}`);
    const detail = amountWithFrequency(details.amount, details.frequency, t);
    items.push(detail ? `${escapeHtml(label)}: ${escapeHtml(detail)}` : escapeHtml(label));
  }
  rows.push({
    key: { text: t('rows.regularExpenses.label') },
    value: items.length > 0 ? { html: listHtml(items) } : { text: t('noAnswerProvided') },
    actions: {
      items: [change('what-other-regular-expenses-do-you-have', 'rows.regularExpenses.changeHidden')],
    },
  });
}

function addOtherConsiderationsRow({ rows, responses, t, change, yesNoNotSure }: RowContext): void {
  // Always shown; stored on defendantResponses, not householdCircumstances.
  if (!responses.otherConsiderations) {
    return;
  }
  rows.push({
    key: { text: t('rows.otherConsiderations.label') },
    value: { text: yesNoNotSure(responses.otherConsiderations) },
    actions: { items: [change('other-considerations', 'rows.otherConsiderations.changeHidden')] },
  });

  const detail = responses.otherConsiderationsDetails?.trim();
  if (!isYes(responses.otherConsiderations) || !detail) {
    return;
  }
  rows.push({
    key: { text: t('rows.otherConsiderationsDetails.label') },
    value: { html: escapeWithLineBreaks(detail) },
    actions: { items: [change('other-considerations', 'rows.otherConsiderationsDetails.changeHidden')] },
  });
}
