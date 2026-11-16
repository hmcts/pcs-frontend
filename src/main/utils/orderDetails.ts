import { formatDate, parseDate } from '@utils/makeOrderFormat';
import type { ClaimOutcome } from '@utils/orderOutcome';

/*
 * What a judge's free-form order does, as court staff record it when they issue it, so the case can act on it
 * without anyone changing the judge's wording. The answers are kept as the page posts them, by field name.
 */

export type OrderDetailsAnswers = Record<string, string>;

export interface Option {
  value: string;
  text: string;
}

export const ORDER_DOES: readonly Option[] = [
  { value: 'outright', text: 'Outright possession' },
  { value: 'suspended', text: 'Suspended possession' },
  { value: 'adjournment', text: 'Adjournment' },
  { value: 'strike-out', text: 'Strike out or dismiss' },
  { value: 'other', text: 'None of these' },
];
export const OUTRIGHT_POSSESSION: readonly Option[] = [
  { value: 'forthwith', text: 'Possession forthwith' },
  { value: 'by', text: 'Possession on or before a date' },
];
export const GROUNDS: readonly Option[] = [
  { value: 'mandatory', text: 'Mandatory' },
  { value: 'discretionary', text: 'Discretionary' },
];
export const CONDITION: readonly Option[] = [
  { value: 'money', text: 'Money' },
  { value: 'non-money', text: 'Non-money' },
];
export const ADJOURNMENT: readonly Option[] = [
  { value: 'further-hearing', text: 'Adjourned for a further hearing' },
  { value: 'generally', text: 'Adjourned generally' },
];
export const STRIKE_OUT: readonly Option[] = [
  { value: 'struck-out', text: 'Claim struck out' },
  { value: 'dismissed', text: 'Claim dismissed' },
];
export const YES_NO: readonly Option[] = [
  { value: 'yes', text: 'Yes' },
  { value: 'no', text: 'No' },
];

export const MAX_GROUNDS_DETAILS_LENGTH = 500;

const DATE_PARTS = ['day', 'month', 'year'] as const;

/** The fields the page posts, each a choice or text, with each date as its day, month and year. */
export const ORDER_DETAILS_FIELDS = [
  'order-does',
  'outright-possession',
  ...DATE_PARTS.map(part => `outright-date-${part}`),
  'outright-grounds',
  'outright-grounds-details',
  'outright-transfer',
  ...DATE_PARTS.map(part => `suspended-date-${part}`),
  'suspended-condition',
  'suspended-warrant-on-notice',
  'adjournment',
  'strike-out',
];

interface Issue {
  id: string;
  message: string;
}

function dateOf(answers: OrderDetailsAnswers, prefix: string): Date | undefined {
  const [day, month, year] = DATE_PARTS.map(part => answers[`${prefix}-${part}`]?.trim() ?? '');
  return /^\d{4}$/.test(year) ? parseDate(day, month, year) : undefined;
}

const isoDate = (answers: OrderDetailsAnswers, prefix: string) => dateOf(answers, prefix)?.toISOString().slice(0, 10);

export function validateOrderDetails(answers: OrderDetailsAnswers = {}): Issue[] {
  const issues: Issue[] = [];
  const chosen = (id: string, options: readonly Option[], message: string) => {
    if (!options.some(option => option.value === answers[id])) {
      issues.push({ id, message });
    }
  };
  const date = (prefix: string, message: string) => {
    if (!dateOf(answers, prefix)) {
      issues.push({ id: `${prefix}-day`, message });
    }
  };
  chosen('order-does', ORDER_DOES, 'Select what the order does');
  switch (answers['order-does']) {
    case 'outright': {
      chosen('outright-possession', OUTRIGHT_POSSESSION, 'Select when possession is ordered');
      if (answers['outright-possession'] === 'by') {
        date('outright-date', 'Enter a real date possession is ordered by');
      }
      chosen('outright-grounds', GROUNDS, 'Select the grounds possession is ordered on');
      // Many orders say only whether the grounds are mandatory or discretionary.
      if ((answers['outright-grounds-details']?.trim() ?? '').length > MAX_GROUNDS_DETAILS_LENGTH) {
        issues.push({
          id: 'outright-grounds-details',
          message: 'Details of the grounds must be 500 characters or less',
        });
      }
      chosen('outright-transfer', YES_NO, 'Select if the order transfers enforcement to the High Court');
      break;
    }
    case 'suspended':
      date('suspended-date', 'Enter a real date possession is ordered by');
      chosen('suspended-condition', CONDITION, 'Select if the condition is money or non-money');
      chosen(
        'suspended-warrant-on-notice',
        YES_NO,
        'Select if any application for a warrant must be made on notice to all parties'
      );
      break;
    case 'adjournment':
      chosen('adjournment', ADJOURNMENT, 'Select how the claim is adjourned');
      break;
    case 'strike-out':
      chosen('strike-out', STRIKE_OUT, 'Select if the claim is struck out or dismissed');
      break;
  }
  return issues;
}

const label = (options: readonly Option[], value?: string) =>
  options.find(option => option.value === value)?.text ?? '';

function displayDate(answers: OrderDetailsAnswers, prefix: string): string {
  const date = dateOf(answers, prefix);
  return date ? formatDate(date) : '';
}

/** The answers as check your answers lists them: each question asked and its answer. */
export function orderDetailsRows(answers: OrderDetailsAnswers = {}): [string, string][] {
  const rows: [string, string][] = [['What does the order do?', label(ORDER_DOES, answers['order-does'])]];
  switch (answers['order-does']) {
    case 'outright':
      rows.push(
        [
          'Possession',
          answers['outright-possession'] === 'by'
            ? `On or before ${displayDate(answers, 'outright-date')}`
            : label(OUTRIGHT_POSSESSION, answers['outright-possession']),
        ],
        ['Grounds', label(GROUNDS, answers['outright-grounds'])],
        ['Details of the grounds', answers['outright-grounds-details']?.trim() || 'None'],
        ['Transfer to the High Court for enforcement', label(YES_NO, answers['outright-transfer'])]
      );
      break;
    case 'suspended':
      rows.push(
        ['Possession on or before', displayDate(answers, 'suspended-date')],
        ['Condition', label(CONDITION, answers['suspended-condition'])],
        ['Any application for a warrant on notice', label(YES_NO, answers['suspended-warrant-on-notice'])]
      );
      break;
    case 'adjournment':
      rows.push(['Adjournment', label(ADJOURNMENT, answers.adjournment)]);
      break;
    case 'strike-out':
      rows.push(['Outcome', label(STRIKE_OUT, answers['strike-out'])]);
      break;
  }
  return rows;
}

const upper = (value: string) => value.toUpperCase().replace(/-/g, '_');
const yes = (value: string) => value === 'yes';

/** What court staff record a free-form order does, as the claim outcome every issued order gives pcs-api. */
export function orderDetailsRequest(answers: OrderDetailsAnswers = {}): ClaimOutcome {
  switch (answers['order-does']) {
    case 'outright':
      return {
        kind: 'OUTRIGHT_POSSESSION',
        possessionForthwith: answers['outright-possession'] === 'forthwith',
        possessionDate: answers['outright-possession'] === 'by' ? isoDate(answers, 'outright-date') : undefined,
        grounds: upper(answers['outright-grounds']) as ClaimOutcome['grounds'],
        groundsDetails: answers['outright-grounds-details']?.trim() || undefined,
      };
    case 'suspended':
      return {
        kind: 'SUSPENDED_POSSESSION',
        possessionDate: isoDate(answers, 'suspended-date'),
        warrantOnNotice: yes(answers['suspended-warrant-on-notice']),
      };
    // Asked as the free-form categories agree, but an adjournment manages the case without deciding the claim.
    case 'adjournment':
      return { kind: 'NO_ORDER' };
    case 'strike-out':
      return { kind: upper(answers['strike-out']) as ClaimOutcome['kind'] };
    default:
      return { kind: 'OTHER' };
  }
}
