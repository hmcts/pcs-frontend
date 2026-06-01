import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { formatIsoDate, penceToPounds } from '../../utils';
import {
  type BaseRowContext,
  type SummaryListRow,
  createRowContext,
  escapeWithLineBreaks,
  groupQuestionAndDetail,
  isYes,
  pushDetailRow,
  pushYesNoRow,
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

interface RowContext extends BaseRowContext {
  responses: CcdDefendantResponses;
  hc: HouseholdCircumstances;
}

export function buildSectionCyaRows(req: Request, t: TFunction): SummaryListRow[] {
  const base = createRowContext(req, SECTION_ID, t);
  if (!base) {
    return [];
  }

  const responses = base.validatedCase.defendantResponses ?? {};
  const ctx: RowContext = {
    ...base,
    responses,
    hc: responses.householdCircumstances ?? {},
  };

  addShareIncomeExpenseDetailsRow(ctx);
  addRegularIncomeRows(ctx);
  addAppliedForUcRow(ctx);
  addPriorityDebtsRow(ctx);
  addPriorityDebtDetailsRow(ctx);
  addRegularExpensesRows(ctx);
  addOtherConsiderationsRow(ctx);

  return ctx.rows;
}

// frequencyNamespace picks the per-context wording (incomeFrequencies / paymentFrequencies / frequencies).
function amountWithFrequency(
  amount: string | null | undefined,
  frequency: string | null | undefined,
  t: TFunction,
  frequencyNamespace = 'frequencies'
): string {
  const pounds = penceToPounds(amount ?? undefined);
  const money = pounds ? `£${pounds}` : '';
  const freq = frequency ? t(`${frequencyNamespace}.${String(frequency).trim().toUpperCase()}`) : '';
  return [money, freq].filter(Boolean).join(' ');
}

// Heading row, then one row per selected item. If nothing's selected, the heading row
// itself shows "No answer provided" so there's still a Change link back to the page.
function pushHeadingWithItems(
  rows: SummaryListRow[],
  labelKey: string,
  step: string,
  itemRows: SummaryListRow[],
  t: TFunction,
  change: BaseRowContext['change']
): void {
  if (itemRows.length === 0) {
    rows.push({
      key: { text: t(`${labelKey}.label`) },
      value: { text: t('noAnswerProvided') },
      actions: { items: [change(step, `${labelKey}.changeHidden`)] },
    });
    return;
  }
  rows.push({
    classes: 'govuk-summary-list__row--no-border',
    key: { text: t(`${labelKey}.label`) },
    value: { text: '' },
  });
  // Strip borders so the group reads as one block; the last item keeps its line.
  itemRows.slice(0, -1).forEach(row => {
    row.classes = 'govuk-summary-list__row--no-border';
  });
  rows.push(...itemRows);
}

function addShareIncomeExpenseDetailsRow({ rows, hc, t, change, yesNoNotSure }: RowContext): void {
  // The gate for the rest of the section. The normaliser keeps this field even
  // when the answer is "No" (it only drops the branch below).
  if (!hc.shareIncomeExpenseDetails) {
    return;
  }
  pushYesNoRow(
    rows,
    'rows.shareIncomeExpenseDetails',
    hc.shareIncomeExpenseDetails,
    'income-and-expenses',
    t,
    yesNoNotSure,
    change
  );
}

function addRegularIncomeRows({ rows, hc, t, change }: RowContext): void {
  // Only when the user opted into finance details. One row per source they picked.
  if (!isYes(hc.shareIncomeExpenseDetails)) {
    return;
  }
  const step = 'what-regular-income-do-you-receive';
  const itemRows: SummaryListRow[] = [];

  for (const source of INCOME_SOURCES) {
    if (!isYes(hc[source.key])) {
      continue;
    }
    const optionKey = `rows.regularIncome.options.${source.key}`;
    const detail = amountWithFrequency(hc[source.amount], hc[source.frequency], t, 'incomeFrequencies');
    itemRows.push({
      key: { text: t(optionKey), classes: 'govuk-!-font-weight-regular' },
      value: { text: detail },
      actions: { items: [change(step, 'rows.regularIncome.changeHidden')] },
    });
  }

  if (isYes(hc.moneyFromElsewhere)) {
    const optionKey = 'rows.regularIncome.options.moneyFromElsewhere';
    const detail = hc.moneyFromElsewhereDetails?.trim();
    itemRows.push({
      key: { text: t(optionKey), classes: 'govuk-!-font-weight-regular' },
      value: detail ? { html: escapeWithLineBreaks(detail) } : { text: '' },
      actions: { items: [change(step, 'rows.regularIncome.changeHidden')] },
    });
  }

  pushHeadingWithItems(rows, 'rows.regularIncome', step, itemRows, t, change);
}

function addAppliedForUcRow({ rows, hc, t, change, yesNoNotSure }: RowContext): void {
  // The step is skipped (and the field absent) when the defendant is already on UC,
  // so a presence check is correct.
  if (!hc.hasAppliedForUniversalCredit) {
    return;
  }
  const questionRow = pushYesNoRow(
    rows,
    'rows.hasAppliedForUniversalCredit',
    hc.hasAppliedForUniversalCredit,
    'have-you-applied-for-universal-credit',
    t,
    yesNoNotSure,
    change
  );

  if (!isYes(hc.hasAppliedForUniversalCredit) || !hc.ucApplicationDate) {
    return;
  }
  const detailRow: SummaryListRow = {
    key: { text: t('rows.universalCreditApplicationDate.label') },
    value: { text: formatIsoDate(hc.ucApplicationDate) },
    actions: {
      items: [change('have-you-applied-for-universal-credit', 'rows.universalCreditApplicationDate.changeHidden')],
    },
  };
  groupQuestionAndDetail(questionRow, detailRow);
  rows.push(detailRow);
}

function addPriorityDebtsRow({ rows, hc, t, change, yesNoNotSure }: RowContext): void {
  if (!hc.priorityDebts) {
    return;
  }
  pushYesNoRow(rows, 'rows.priorityDebts', hc.priorityDebts, 'priority-debts', t, yesNoNotSure, change);
}

function addPriorityDebtDetailsRow({ rows, hc, t, change }: RowContext): void {
  // Only present when priorityDebts === YES (the normaliser drops these fields
  // otherwise). Amounts are stored in pence. Each step-page question maps to
  // its own CYA row so the question text matches the step heading verbatim.
  const totalPounds = penceToPounds(hc.debtTotal);
  if (totalPounds) {
    rows.push({
      key: { text: t('rows.priorityDebtTotal.label') },
      value: { text: `£${totalPounds}` },
      actions: { items: [change('priority-debt-details', 'rows.priorityDebtTotal.changeHidden')] },
    });
  }
  const contribution = amountWithFrequency(hc.debtContribution, hc.debtContributionFrequency, t, 'paymentFrequencies');
  if (contribution) {
    rows.push({
      key: { text: t('rows.priorityDebtContribution.label') },
      value: { text: contribution },
      actions: { items: [change('priority-debt-details', 'rows.priorityDebtContribution.changeHidden')] },
    });
  }
}

function addRegularExpensesRows({ rows, hc, t, change }: RowContext): void {
  // Same as regular income: one row per expense the user picked.
  if (!isYes(hc.shareIncomeExpenseDetails)) {
    return;
  }
  const step = 'what-other-regular-expenses-do-you-have';
  const itemRows: SummaryListRow[] = [];
  for (const key of EXPENSE_KEYS) {
    const details = hc[key];
    if (!details || !isYes(details.applies)) {
      continue;
    }
    const optionKey = `rows.regularExpenses.options.${key}`;
    const detail = amountWithFrequency(details.amount, details.frequency, t);
    itemRows.push({
      key: { text: t(optionKey), classes: 'govuk-!-font-weight-regular' },
      value: { text: detail },
      actions: { items: [change(step, 'rows.regularExpenses.changeHidden')] },
    });
  }
  pushHeadingWithItems(rows, 'rows.regularExpenses', step, itemRows, t, change);
}

function addOtherConsiderationsRow({ rows, responses, t, change, yesNoNotSure }: RowContext): void {
  // Always shown; stored on defendantResponses, not householdCircumstances.
  if (!responses.otherConsiderations) {
    return;
  }
  const questionRow = pushYesNoRow(
    rows,
    'rows.otherConsiderations',
    responses.otherConsiderations,
    'other-considerations',
    t,
    yesNoNotSure,
    change
  );

  const detail = responses.otherConsiderationsDetails?.trim();
  if (!isYes(responses.otherConsiderations) || !detail) {
    return;
  }
  pushDetailRow(rows, questionRow, 'rows.otherConsiderationsDetails', detail, 'other-considerations', t, change);
}
