import escapeHtml from 'escape-html';
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
  listHtml,
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
  addRegularIncomeRow(ctx);
  addAppliedForUcRow(ctx);
  addPriorityDebtsRow(ctx);
  addPriorityDebtDetailsRow(ctx);
  addRegularExpensesRow(ctx);
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
    const detail = amountWithFrequency(hc[source.amount], hc[source.frequency], t, 'incomeFrequencies');
    items.push(detail ? `${escapeHtml(label)} ${escapeHtml(detail)}` : escapeHtml(label));
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

function pushExpandedRows(
  { rows, t, change }: BaseRowContext,
  items: { label: string; value: SummaryListRow['value'] }[],
  headerLabel: string,
  step: string,
  changeHidden: string
): void {
  rows.push({
    key: { text: headerLabel },
    value: items.length ? {} : { text: t('noAnswerProvided') },
    classes: 'govuk-summary-list__row--no-border',
    actions: { items: [change(step, changeHidden)] },
  });
  items.forEach(({ label, value }) =>
    rows.push({
      key: { text: label, classes: 'govuk-!-font-weight-regular' },
      value,
      classes: 'govuk-summary-list__row--no-border',
      actions: { items: [change(step, changeHidden)] },
    })
  );
}

function addEOJRegularIncomeRows(ctx: RowContext): void {
  const { hc, t } = ctx;
  if (!isYes(hc.shareIncomeExpenseDetails)) {
    return;
  }
  const items = [];
  for (const source of INCOME_SOURCES) {
    if (isYes(hc[source.key])) {
      items.push({
        label: t(`rows.regularIncome.options.${source.key}`),
        value: { text: amountWithFrequency(hc[source.amount], hc[source.frequency], t, 'incomeFrequencies') },
      });
    }
  }
  if (isYes(hc.moneyFromElsewhere)) {
    const detail = hc.moneyFromElsewhereDetails?.trim() ?? '';
    items.push({
      label: t('rows.regularIncome.options.moneyFromElsewhere'),
      value: detail ? { html: escapeWithLineBreaks(detail) } : { text: '' },
    });
  }
  pushExpandedRows(
    ctx,
    items,
    t('rows.regularIncome.label'),
    'what-regular-income-do-you-receive',
    'rows.regularIncome.changeHidden'
  );
}

function addEOJRegularExpensesRows(ctx: RowContext): void {
  const { hc, t } = ctx;
  if (!isYes(hc.shareIncomeExpenseDetails)) {
    return;
  }
  const items = [];
  for (const key of EXPENSE_KEYS) {
    const details = hc[key];
    if (details && isYes(details.applies)) {
      items.push({
        label: t(`rows.regularExpenses.options.${key}`),
        value: { text: amountWithFrequency(details.amount, details.frequency, t) },
      });
    }
  }
  pushExpandedRows(
    ctx,
    items,
    t('rows.regularExpenses.label'),
    'what-other-regular-expenses-do-you-have',
    'rows.regularExpenses.changeHidden'
  );
}

export function buildEOJIncomeAndExpensesRow(req: Request, t: TFunction): SummaryListRow[] {
  const base = createRowContext(req, SECTION_ID, t);
  if (!base) {
    return [];
  }
  const responses = base.validatedCase.defendantResponses ?? {};
  const ctx: RowContext = { ...base, responses, hc: responses.householdCircumstances ?? {} };
  addShareIncomeExpenseDetailsRow(ctx);
  return ctx.rows;
}

export function buildEOJRegularIncomeRows(req: Request, t: TFunction): SummaryListRow[] {
  const base = createRowContext(req, SECTION_ID, t);
  if (!base) {
    return [];
  }
  const responses = base.validatedCase.defendantResponses ?? {};
  const ctx: RowContext = { ...base, responses, hc: responses.householdCircumstances ?? {} };
  addEOJRegularIncomeRows(ctx);
  return ctx.rows;
}

export function buildEOJUniversalCreditRows(req: Request, t: TFunction): SummaryListRow[] {
  const base = createRowContext(req, SECTION_ID, t);
  if (!base) {
    return [];
  }
  const responses = base.validatedCase.defendantResponses ?? {};
  const ctx: RowContext = { ...base, responses, hc: responses.householdCircumstances ?? {} };
  addAppliedForUcRow(ctx);
  return ctx.rows;
}

export function buildEOJPriorityDebtsRows(req: Request, t: TFunction): SummaryListRow[] {
  const base = createRowContext(req, SECTION_ID, t);
  if (!base) {
    return [];
  }
  const responses = base.validatedCase.defendantResponses ?? {};
  const ctx: RowContext = { ...base, responses, hc: responses.householdCircumstances ?? {} };
  addPriorityDebtsRow(ctx);
  addPriorityDebtDetailsRow(ctx);
  return ctx.rows;
}

export function buildEOJRegularExpensesRows(req: Request, t: TFunction): SummaryListRow[] {
  const base = createRowContext(req, SECTION_ID, t);
  if (!base) {
    return [];
  }
  const responses = base.validatedCase.defendantResponses ?? {};
  const ctx: RowContext = { ...base, responses, hc: responses.householdCircumstances ?? {} };
  addEOJRegularExpensesRows(ctx);
  return ctx.rows;
}

export function buildEOJOtherConsiderationsRows(req: Request, t: TFunction): SummaryListRow[] {
  const base = createRowContext(req, SECTION_ID, t);
  if (!base) {
    return [];
  }
  const responses = base.validatedCase.defendantResponses ?? {};
  const ctx: RowContext = { ...base, responses, hc: responses.householdCircumstances ?? {} };
  addOtherConsiderationsRow(ctx);
  return ctx.rows;
}
