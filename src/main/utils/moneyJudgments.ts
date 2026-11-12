import { formatDate, formatMoney, parseDate, parseMoney } from '@utils/makeOrderFormat';
import type { FormData } from '@utils/orderCase';

/*
 * The money judgments an order makes and what it says about costs, as court staff record them when they issue it:
 * who owes each sum and who is owed it, the sums, and how they are paid. For an order its form generated they start
 * from the judge's answers; for one the judge wrote, from nothing.
 */

export interface Option {
  value: string;
  text: string;
}

export const COSTS: readonly Option[] = [
  { value: 'DEFENDANT_PAYS_FIXED', text: "Defendant pays the claimant's fixed costs" },
  { value: 'DEFENDANT_PAYS_SUMMARY', text: "Defendant pays the claimant's summarily assessed costs" },
  { value: 'DEFENDANT_PAYS', text: "Defendant pays the claimant's costs" },
  { value: 'CLAIMANT_PAYS_SUMMARY', text: "Claimant pays the defendant's summarily assessed costs" },
  { value: 'PUBLIC_FUNDING', text: "Detailed assessment of the defendant's publicly funded costs" },
  { value: 'COSTS_IN_CASE', text: 'Costs in the case' },
  { value: 'RESERVED', text: 'Costs reserved' },
  { value: 'NO_ORDER', text: 'No order as to costs' },
  { value: 'OTHER', text: 'Another costs order' },
  { value: 'NONE', text: 'The order says nothing about costs' },
];

export const FREQUENCIES: readonly Option[] = [
  { value: 'WEEKLY', text: 'Weekly' },
  { value: 'FORTNIGHTLY', text: 'Fortnightly' },
  { value: 'MONTHLY', text: 'Monthly' },
];

export const MAX_MONEY_JUDGMENTS = 10;

export interface DateAnswer {
  day: string;
  month: string;
  year: string;
}

/** A money judgment as the page shows it, each answer as typed. */
export interface MoneyJudgmentAnswer {
  debtors: string[];
  creditors: string[];
  arrears: string;
  otherAmount: string;
  costs: string;
  oneOffAmount: string;
  oneOffDate: DateAnswer;
  payBy: DateAnswer;
  instalmentAmount: string;
  instalmentFrequency: string;
  firstInstalmentDate: DateAnswer;
  suspended: boolean;
}

export interface MoneyJudgmentsAnswers {
  costs?: string;
  hasMoneyJudgments?: 'yes' | 'no';
  judgments: MoneyJudgmentAnswer[];
}

/** The case's parties by side, by id. */
export interface Sides {
  claimants: string[];
  defendants: string[];
}

interface Issue {
  id: string;
  message: string;
}

const BLANK_DATE: DateAnswer = { day: '', month: '', year: '' };

/** A judgment to fill in: against all the defendants, in favour of all the claimants, as most are. */
export function blankJudgment(sides: Sides): MoneyJudgmentAnswer {
  return {
    debtors: [...sides.defendants],
    creditors: [...sides.claimants],
    arrears: '',
    otherAmount: '',
    costs: '',
    oneOffAmount: '',
    oneOffDate: { ...BLANK_DATE },
    payBy: { ...BLANK_DATE },
    instalmentAmount: '',
    instalmentFrequency: '',
    firstInstalmentDate: { ...BLANK_DATE },
    suspended: false,
  };
}

// The judge's make order form, as it holds its answers.

function first(value: unknown): string {
  return String((Array.isArray(value) ? value[0] : value) ?? '').trim();
}

function all(value: unknown): string[] {
  return (Array.isArray(value) ? value : [value]).filter(v => v !== undefined && v !== '').map(String);
}

function dateOf(formData: FormData, prefix: string): DateAnswer {
  const [day, month, year] = ['day', 'month', 'year'].map(part => first(formData[`${prefix}-${part}`]));
  return { day, month, year };
}

const COSTS_CHOICES: Record<string, string> = {
  'def-pay-cl-fixed': 'DEFENDANT_PAYS_FIXED',
  'fixed-same-terms': 'DEFENDANT_PAYS_FIXED',
  'def-pay-cl-summary': 'DEFENDANT_PAYS_SUMMARY',
  'summary-same-terms': 'DEFENDANT_PAYS_SUMMARY',
  'same-terms': 'DEFENDANT_PAYS',
  'cl-pay-def-summary': 'CLAIMANT_PAYS_SUMMARY',
  'public-funding': 'PUBLIC_FUNDING',
  'in-case': 'COSTS_IN_CASE',
  reserved: 'RESERVED',
  'no-order': 'NO_ORDER',
  other: 'OTHER',
};
const SAME_TERMS_COSTS = new Set(['same-terms', 'fixed-same-terms', 'summary-same-terms']);

/**
 * The money judgments and costs an order its form generated makes, from the judge's answers for its type, for court
 * staff to check: the arrears judgment its type makes, and any costs the judge put a sum on as one of their own.
 */
export function judgmentsFromOrder(orderType: string, formData: FormData, sides: Sides): MoneyJudgmentsAnswers {
  const judgments: MoneyJudgmentAnswer[] = [];
  if (orderType === 'OUTRIGHT_POSSESSION' && all(formData['outright-options']).includes('money-judgment')) {
    const sections = all(formData['outright-mj-sections']);
    const plan = sections.includes('payment-plan') ? all(formData['outright-mj-plan']) : [];
    const lump = plan.includes('lump');
    const instalments = plan.includes('instalments');
    judgments.push({
      ...blankJudgment(sides),
      arrears: sections.includes('arrears') ? first(formData['outright-mj-arrears']) : '',
      otherAmount: sections.includes('arrears') ? first(formData['outright-mj-interest']) : '',
      oneOffAmount: lump ? first(formData['outright-mj-lump-amount']) : '',
      oneOffDate: lump ? dateOf(formData, 'outright-mj-lump-date') : { ...BLANK_DATE },
      payBy:
        lump && all(formData['outright-mj-balance']).includes('yes')
          ? dateOf(formData, 'outright-mj-balance-date')
          : { ...BLANK_DATE },
      instalmentAmount: instalments ? first(formData['outright-mj-inst-amount']) : '',
      instalmentFrequency: instalments ? first(formData['outright-mj-inst-freq']).toUpperCase() : '',
      firstInstalmentDate: instalments ? dateOf(formData, 'outright-mj-inst-date') : { ...BLANK_DATE },
    });
  }
  if (orderType === 'SUSPENDED_POSSESSION' && all(formData['suspended-options']).includes('money-judgment-arrears')) {
    judgments.push({
      ...blankJudgment(sides),
      arrears: first(formData['suspended-arrears']),
      suspended: all(formData['suspended-mj-same-terms']).includes('yes'),
    });
  }
  const costsChoice = all(formData.costs).includes('yes') ? first(formData['costs-choice']) : '';
  const costsAmount = first(formData[`costs-${costsChoice}-amount`]);
  const claimantPays = costsChoice === 'cl-pay-def-summary';
  // An outright order's payment terms are for "the above sums", the defendant's costs among them.
  const outrightJudgment = orderType === 'OUTRIGHT_POSSESSION' && !claimantPays ? judgments[0] : undefined;
  if (costsAmount && outrightJudgment) {
    outrightJudgment.costs = costsAmount;
  } else if (costsAmount) {
    judgments.push({
      ...blankJudgment(sides),
      debtors: [...(claimantPays ? sides.claimants : sides.defendants)],
      creditors: [...(claimantPays ? sides.defendants : sides.claimants)],
      costs: costsAmount,
      suspended: orderType === 'SUSPENDED_POSSESSION' && SAME_TERMS_COSTS.has(costsChoice),
    });
  }
  return {
    costs: COSTS_CHOICES[costsChoice] ?? 'NONE',
    hasMoneyJudgments: judgments.length ? 'yes' : 'no',
    judgments,
  };
}

// The page's own fields, a judgment's prefixed with its number.

function postedDate(body: Record<string, unknown>, prefix: string): DateAnswer {
  const [day, month, year] = ['day', 'month', 'year'].map(part => first(body[`${prefix}-${part}`]));
  return { day, month, year };
}

/** The judgments on the page, as many as it showed, each only between the case's parties. */
export function postedJudgments(
  body: Record<string, unknown>,
  shown: number,
  parties: Set<string>
): MoneyJudgmentAnswer[] {
  return Array.from({ length: shown }, (_, index): MoneyJudgmentAnswer => {
    const prefix = `judgment-${index + 1}`;
    const field = (name: string) => first(body[`${prefix}-${name}`]);
    return {
      debtors: all(body[`${prefix}-debtors`]).filter(id => parties.has(id)),
      creditors: all(body[`${prefix}-creditors`]).filter(id => parties.has(id)),
      arrears: field('arrears'),
      otherAmount: field('other-amount'),
      costs: field('costs'),
      oneOffAmount: field('one-off-amount'),
      oneOffDate: postedDate(body, `${prefix}-one-off-date`),
      payBy: postedDate(body, `${prefix}-pay-by`),
      instalmentAmount: field('instalment-amount'),
      instalmentFrequency: field('instalment-frequency'),
      firstInstalmentDate: postedDate(body, `${prefix}-first-instalment-date`),
      suspended: all(body[`${prefix}-suspended`]).includes('yes'),
    };
  });
}

const given = (date: DateAnswer) => Boolean(date.day || date.month || date.year);
const isoDate = (date: DateAnswer) =>
  /^\d{4}$/.test(date.year) ? parseDate(date.day, date.month, date.year)?.toISOString().slice(0, 10) : undefined;

export function validateMoneyJudgments(answers: MoneyJudgmentsAnswers | undefined): Issue[] {
  const issues: Issue[] = [];
  if (!COSTS.some(option => option.value === answers?.costs)) {
    issues.push({ id: 'costs', message: 'Select what the order says about costs' });
  }
  if (!answers?.hasMoneyJudgments) {
    issues.push({ id: 'has-money-judgments', message: 'Select if the order makes a money judgment' });
  }
  if (answers?.hasMoneyJudgments !== 'yes') {
    return issues;
  }
  answers.judgments.forEach((judgment, index) => {
    const n = index + 1;
    const prefix = `judgment-${n}`;
    const add = (id: string, message: string) => issues.push({ id: `${prefix}-${id}`, message });
    const amount = (id: string, value: string, name: string) => {
      if (value && parseMoney(value) === undefined) {
        add(id, `Enter a valid ${name} for money judgment ${n}`);
      }
    };
    const date = (id: string, value: DateAnswer, name: string) => {
      if (!isoDate(value)) {
        add(`${id}-day`, `Enter a real date ${name} for money judgment ${n}`);
      }
    };
    if (!judgment.debtors.length) {
      add('debtors', `Select who must pay money judgment ${n}`);
    }
    if (!judgment.creditors.length) {
      add('creditors', `Select who is paid money judgment ${n}`);
    } else if (judgment.creditors.some(id => judgment.debtors.includes(id))) {
      add('creditors', `A party cannot both pay and be paid money judgment ${n}`);
    }
    if (!judgment.arrears && !judgment.otherAmount && !judgment.costs) {
      add('arrears', `Enter the sum of money judgment ${n}`);
    }
    amount('arrears', judgment.arrears, 'arrears');
    amount('other-amount', judgment.otherAmount, 'interest or other sum');
    amount('costs', judgment.costs, 'costs');
    if (judgment.oneOffAmount || given(judgment.oneOffDate)) {
      if (!parseMoney(judgment.oneOffAmount)) {
        add('one-off-amount', `Enter a valid one-off payment for money judgment ${n}`);
      }
      date('one-off-date', judgment.oneOffDate, 'the one-off payment is due');
    }
    if (given(judgment.payBy)) {
      date('pay-by', judgment.payBy, 'it must be paid by');
    }
    if (judgment.instalmentAmount || judgment.instalmentFrequency || given(judgment.firstInstalmentDate)) {
      if (!parseMoney(judgment.instalmentAmount)) {
        add('instalment-amount', `Enter a valid instalment for money judgment ${n}`);
      }
      if (!FREQUENCIES.some(option => option.value === judgment.instalmentFrequency)) {
        add('instalment-frequency', `Select how often instalments of money judgment ${n} are paid`);
      }
      date('first-instalment-date', judgment.firstInstalmentDate, 'the first instalment is due');
    }
  });
  return issues;
}

const money = (value: string) => (value ? parseMoney(value) : undefined);

/** The costs and money judgments as pcs-api records them when the order is issued. */
export function moneyJudgmentsRequest(answers: MoneyJudgmentsAnswers | undefined): Record<string, unknown> {
  const judgments = answers?.hasMoneyJudgments === 'yes' ? answers.judgments : [];
  const instalments = (judgment: MoneyJudgmentAnswer) => Boolean(judgment.instalmentAmount);
  return {
    costs: answers?.costs && answers.costs !== 'NONE' ? answers.costs : undefined,
    moneyJudgments: judgments.map(judgment => ({
      arrears: money(judgment.arrears),
      otherAmount: money(judgment.otherAmount),
      costs: money(judgment.costs),
      oneOffAmount: money(judgment.oneOffAmount),
      oneOffDate: judgment.oneOffAmount ? isoDate(judgment.oneOffDate) : undefined,
      payBy: isoDate(judgment.payBy),
      instalmentAmount: instalments(judgment) ? money(judgment.instalmentAmount) : undefined,
      instalmentFrequency: instalments(judgment) ? judgment.instalmentFrequency : undefined,
      firstInstalmentDate: instalments(judgment) ? isoDate(judgment.firstInstalmentDate) : undefined,
      suspended: judgment.suspended,
      debtors: judgment.debtors,
      creditors: judgment.creditors,
    })),
  };
}

const label = (options: readonly Option[], value?: string) =>
  options.find(option => option.value === value)?.text ?? '';

function displayDate(date: DateAnswer): string {
  const iso = isoDate(date);
  return iso ? formatDate(new Date(iso)) : '';
}

const pounds = (value: string) => `£${formatMoney(parseMoney(value) ?? 0)}`;

/** The answers as check your answers lists them: each question and its answer, a judgment's as several lines. */
export function moneyJudgmentRows(
  answers: MoneyJudgmentsAnswers | undefined,
  partyName: (id: string) => string
): [string, string[]][] {
  const rows: [string, string[]][] = [
    ['What does the order say about costs?', [label(COSTS, answers?.costs)]],
    ['Does the order make a money judgment?', [answers?.hasMoneyJudgments === 'yes' ? 'Yes' : 'No']],
  ];
  if (answers?.hasMoneyJudgments !== 'yes') {
    return rows;
  }
  answers.judgments.forEach((judgment, index) => {
    const lines = [
      `Paid by: ${judgment.debtors.map(partyName).join(', ')}`,
      `Paid to: ${judgment.creditors.map(partyName).join(', ')}`,
      ...(judgment.arrears ? [`Arrears: ${pounds(judgment.arrears)}`] : []),
      ...(judgment.otherAmount ? [`Interest or other sum: ${pounds(judgment.otherAmount)}`] : []),
      ...(judgment.costs ? [`Costs: ${pounds(judgment.costs)}`] : []),
      ...(judgment.oneOffAmount
        ? [`One-off payment: ${pounds(judgment.oneOffAmount)} by ${displayDate(judgment.oneOffDate)}`]
        : []),
      ...(given(judgment.payBy)
        ? [`${judgment.oneOffAmount ? 'Balance' : 'To be paid in full'} by ${displayDate(judgment.payBy)}`]
        : []),
      ...(judgment.instalmentAmount
        ? [
            `Instalments: ${pounds(judgment.instalmentAmount)} ${label(FREQUENCIES, judgment.instalmentFrequency).toLowerCase()}, ` +
              `the first by ${displayDate(judgment.firstInstalmentDate)}`,
          ]
        : []),
      ...(judgment.suspended ? ['Enforcement suspended on the terms of the possession order'] : []),
    ];
    rows.push([`Money judgment ${index + 1}`, lines]);
  });
  return rows;
}
