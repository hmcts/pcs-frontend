import { MAX_MONEY, exceedsMaxMoney, parseDate, parseMoney, parseTime } from './makeOrderFormat';

export const MAKE_ORDER_TYPES = [
  'OUTRIGHT_POSSESSION',
  'SUSPENDED_POSSESSION',
  'ADJOURNMENT',
  'STRIKE_OUT_DISMISSAL',
  'FREE_FORM',
] as const;
export type MakeOrderType = (typeof MAKE_ORDER_TYPES)[number];

export interface MakeOrderValidationIssue {
  id: string;
  message: string;
}

/** A party on the attendance register: `id` prefixes its answers, `label` names it, e.g. "Claimant 1: Example Housing". */
export interface AttendanceParty {
  id: string;
  label: string;
  type: 'claimant' | 'defendant';
}

const ATTENDANCE_CHOICES: Record<AttendanceParty['type'], readonly string[]> = {
  claimant: [
    'counsel',
    'solicitor',
    'solicitor-agent',
    'housing-officer',
    'litigant-in-person',
    'letter-only',
    'not-present',
  ],
  defendant: [
    'counsel',
    'solicitor',
    'solicitor-agent',
    'duty-adviser',
    'litigant-in-person',
    'letter-only',
    'not-present',
  ],
};

/** Attendance by someone speaking for the party, whom the order names. */
const NAMED_ATTENDANCE = ['counsel', 'solicitor', 'solicitor-agent', 'housing-officer', 'duty-adviser'];

const MAX_ATTENDANCE_NAME_LENGTH = 120;

const PAYMENT_FREQUENCIES = ['weekly', 'fortnightly', 'monthly'];

const MAX_FREE_TEXT_LENGTH = 30000;
const MAX_GROUNDS_DETAILS_LENGTH = 100;

function value(formData: Record<string, unknown>, name: string): string {
  return String(formData[name] ?? '').trim();
}

function values(formData: Record<string, unknown>, name: string): string[] {
  const raw = formData[name];
  return (Array.isArray(raw) ? raw : raw === undefined ? [] : [raw]).map(String);
}

/** Length as the judge typed it: browsers post each new line in a text box as two characters. */
function textLength(formData: Record<string, unknown>, name: string): number {
  return value(formData, name).replace(/\r\n/g, '\n').length;
}

/**
 * Why an amount is not valid, or nothing if it is. `message` asks for a valid amount, as in "Enter a
 * valid current rent"; an amount over the limit is named from it: "Current rent must be …".
 */
function moneyError(formData: Record<string, unknown>, name: string, message: string): string | undefined {
  const raw = value(formData, name);
  if (parseMoney(raw) !== undefined) {
    return undefined;
  }
  if (!exceedsMaxMoney(raw)) {
    return message;
  }
  const amount = message.replace(/^Enter (a )?valid /, '');
  return `${amount[0].toUpperCase()}${amount.slice(1)} must be £${MAX_MONEY.toLocaleString('en-GB')} or less`;
}

function hasValidDate(formData: Record<string, unknown>, prefix: string): boolean {
  return (
    parseDate(
      value(formData, `${prefix}-day`),
      value(formData, `${prefix}-month`),
      value(formData, `${prefix}-year`)
    ) !== undefined
  );
}

function validation(formData: Record<string, unknown>) {
  const issues: MakeOrderValidationIssue[] = [];
  const add = (valid: boolean, id: string, message: string): void => {
    if (!valid) {
      issues.push({ id, message });
    }
  };
  const addMoney = (id: string, error: string | undefined): void => add(!error, id, error ?? '');
  return {
    issues,
    add,
    maxLength: (id: string, max: number, message: string): void => add(textLength(formData, id) <= max, id, message),
    money: (id: string, message: string): void => addMoney(id, moneyError(formData, id, message)),
    /** An amount the judge need not give, but which must be valid if they do. */
    optionalMoney: (id: string, message: string): void =>
      addMoney(id, value(formData, id) ? moneyError(formData, id, message) : undefined),
    date: (prefix: string, message: string): void => add(hasValidDate(formData, prefix), `${prefix}-day`, message),
    frequency: (id: string, message: string): void =>
      add(PAYMENT_FREQUENCIES.includes(value(formData, id)), id, message),
  };
}

function validateCosts(formData: Record<string, unknown>, suspended: boolean): MakeOrderValidationIssue[] {
  const amountTypes: Partial<Record<string, string>> = {
    'def-pay-cl-fixed': 'fixed',
    'def-pay-cl-summary': 'summary assessed',
    'cl-pay-def-summary': 'summary assessed',
    ...(suspended ? { 'fixed-same-terms': 'fixed', 'summary-same-terms': 'summary assessed' } : {}),
  };
  const choice = value(formData, 'costs-choice');
  const amountType = amountTypes[choice];
  const id = `costs-${choice}-amount`;
  if (!values(formData, 'costs').includes('yes')) {
    return [];
  }
  if (!choice) {
    return [{ id: 'costs-choice', message: 'Select a costs order' }];
  }
  if (choice === 'other' && !value(formData, 'costs-other-text')) {
    return [{ id: 'costs-other-text', message: 'Enter the costs order' }];
  }
  const error =
    amountType &&
    moneyError(formData, id, suspended ? `Enter a valid ${amountType} costs amount` : 'Enter a valid costs amount');
  return error ? [{ id, message: error }] : [];
}

function validateSuspended(formData: Record<string, unknown>): MakeOrderValidationIssue[] {
  const { issues, add, money, date, frequency } = validation(formData);
  const terms = values(formData, 'suspended-payment-terms');
  const options = values(formData, 'suspended-options');

  date('suspended-by-date', 'Enter a valid possession date');
  money('suspended-arrears', 'Enter valid arrears');
  add(
    terms.includes('one-off') || terms.includes('instalments'),
    'suspended-payment-terms',
    'Select a one-off payment or instalments'
  );
  if (terms.includes('one-off')) {
    money('suspended-oneoff-amount', 'Enter a valid one-off payment amount');
    date('suspended-oneoff-date', 'Enter a valid one-off payment date');
  }
  if (terms.includes('instalments')) {
    money('suspended-instalment-amount', 'Enter a valid instalment amount');
    frequency('suspended-instalment-frequency', 'Select weekly, fortnightly or monthly instalments');
    date('suspended-instalment-date', 'Enter a valid first instalment date');
  }
  if (options.includes('use-occupation')) {
    money('suspended-use-occupation-rate', 'Enter a valid daily rate for use and occupation');
    date('suspended-use-occupation-from-date', 'Enter a valid start date for use and occupation');
  }

  return [...issues, ...validateCosts(formData, true)];
}

function validateOutright(formData: Record<string, unknown>): MakeOrderValidationIssue[] {
  const { issues, add, money, optionalMoney, date, frequency, maxLength } = validation(formData);
  const possession = value(formData, 'outright-possession');
  const options = values(formData, 'outright-options');

  add(
    possession === 'forthwith' || possession === 'by',
    'outright-possession',
    'Select when the defendant must give up possession'
  );
  if (possession === 'by') {
    date('outright-by-date', 'Enter a valid possession date');
  }
  add(
    ['mandatory', 'discretionary'].includes(value(formData, 'outright-grounds-type')),
    'outright-grounds-type',
    'Select mandatory or discretionary grounds'
  );
  maxLength(
    'outright-grounds-details',
    MAX_GROUNDS_DETAILS_LENGTH,
    `Details of grounds must be ${MAX_GROUNDS_DETAILS_LENGTH} characters or less`
  );

  if (options.includes('money-judgment')) {
    const sections = values(formData, 'outright-mj-sections');
    add(
      sections.includes('arrears') || sections.includes('payment-plan'),
      'outright-mj-sections',
      'Select what the money judgment covers'
    );
    if (sections.includes('arrears')) {
      money('outright-mj-arrears', 'Enter a valid arrears amount');
      optionalMoney('outright-mj-interest', 'Enter a valid interest amount');
    }
    if (sections.includes('payment-plan')) {
      const plans = values(formData, 'outright-mj-plan');
      add(
        plans.includes('lump') || plans.includes('instalments'),
        'outright-mj-plan',
        'Select payment to claimant or instalment payments'
      );
      if (plans.includes('lump')) {
        money('outright-mj-lump-amount', 'Enter a valid payment amount');
        date('outright-mj-lump-date', 'Enter a valid payment date');
        if (values(formData, 'outright-mj-balance').includes('yes')) {
          date('outright-mj-balance-date', 'Enter a valid balance payment date');
        }
      }
      if (plans.includes('instalments')) {
        money('outright-mj-inst-amount', 'Enter a valid instalment amount');
        frequency('outright-mj-inst-freq', 'Select weekly, fortnightly or monthly instalments');
        date('outright-mj-inst-date', 'Enter a valid first instalment date');
      }
    }
  }

  if (options.includes('use-occupation')) {
    money('outright-use-occupation-rate', 'Enter a valid daily rate for use and occupation');
    date('outright-use-occupation-from-date', 'Enter a valid start date for use and occupation');
  }

  return [...issues, ...validateCosts(formData, false)];
}

function validateAdjournment(formData: Record<string, unknown>): MakeOrderValidationIssue[] {
  const { issues, add, money, date, frequency } = validation(formData);
  const type = value(formData, 'adj-type');

  add(
    type === 'further-hearing' || type === 'generally',
    'adj-type',
    'Select adjourned for further hearing or adjourned generally'
  );
  if (type === 'further-hearing') {
    const when = value(formData, 'adj-when') || 'next-list';
    const hearingDate = `adj-hearing-date-${when}`;
    const directions = values(formData, 'adj-directions');
    date(hearingDate, 'Enter a valid adjournment date');
    add(
      /^\d+$/.test(value(formData, 'adj-time-estimate')) && Number(value(formData, 'adj-time-estimate')) > 0,
      'adj-time-estimate',
      'Enter the time estimate as a whole number'
    );
    add(
      ['minutes', 'hours'].includes(value(formData, 'adj-time-estimate-unit')),
      'adj-time-estimate-unit',
      'Select minutes or hours for the time estimate'
    );
    if (when === 'specific') {
      const time = value(formData, 'adj-specific-time');
      if (!time) {
        add(false, 'adj-specific-time', 'Enter the time of hearing');
      } else {
        add(Boolean(parseTime(time)), 'adj-specific-time', 'Enter a valid time of hearing, like 10:30am or 14:30');
      }
    }
    if (directions.includes('defence')) {
      date('adj-defence-date', 'Enter a valid defence date');
    }
    if (directions.includes('counterclaim')) {
      date('adj-counterclaim-date', 'Enter a valid counterclaim date');
    }
    if (directions.includes('claimant-reply')) {
      date('adj-claimant-reply-date', 'Enter a valid counterclaim reply date');
    }
    add(
      !(directions.includes('defence') && directions.includes('counterclaim')),
      'adj-directions',
      'Select either defence or defence and any counterclaim, not both'
    );
  }
  if (type === 'generally') {
    const conditions = values(formData, 'adj-gen');
    const validatePayment = (option: string, prefix: string, instalments = true): void => {
      if (conditions.includes(option)) {
        money(`${prefix}-amount`, 'Enter a valid payment amount');
        if (instalments) {
          frequency(`${prefix}-frequency`, 'Select weekly, fortnightly or monthly payments');
        }
        date(`${prefix}-date`, 'Enter a valid payment date');
      }
    };
    validatePayment('current-rent-plus', 'adj-gen-current-rent-plus');
    validatePayment('payments', 'adj-gen-payments');
    validatePayment('oneoff', 'adj-gen-oneoff', false);
    add(
      !(conditions.includes('current-rent-plus') && conditions.includes('payments')),
      'adj-gen',
      'Select either current rent plus instalments or instalment payments, not both'
    );
    if (conditions.includes('restore')) {
      date('adj-gen-restore-date', 'Enter a valid restore application date');
    }
  }

  return [...issues, ...validateCosts(formData, false)];
}

function validateStrikeOut(formData: Record<string, unknown>): MakeOrderValidationIssue[] {
  const { issues, add } = validation(formData);
  add(
    ['struck-out', 'dismissed'].includes(value(formData, 'strike-claim-outcome')),
    'strike-claim-outcome',
    'Select whether the claim is struck out or dismissed'
  );
  return [...issues, ...validateCosts(formData, false)];
}

// The error summary takes the judge to the party's row, which names the party and the error.
function validateAttendance(formData: Record<string, unknown>, parties: readonly AttendanceParty[]) {
  const { issues, add } = validation(formData);
  for (const party of parties) {
    const choice = value(formData, `${party.id}-attendance`);
    const name = value(formData, `${party.id}-name`);
    if (!ATTENDANCE_CHOICES[party.type].includes(choice)) {
      add(false, `${party.id}-attendance`, `Select how ${party.label} attended`);
    } else if (NAMED_ATTENDANCE.includes(choice) && !name) {
      add(false, `${party.id}-name`, `Enter the name of the person who attended for ${party.label}`);
    }
    add(
      name.length <= MAX_ATTENDANCE_NAME_LENGTH,
      `${party.id}-name`,
      `Name for ${party.label} must be ${MAX_ATTENDANCE_NAME_LENGTH} characters or less`
    );
  }
  return issues;
}

/** The judge's own figures for the case, which they need not give. */
function validateCaseFacts(formData: Record<string, unknown>): MakeOrderValidationIssue[] {
  const { issues, optionalMoney } = validation(formData);
  optionalMoney('arrears-notice', 'Enter valid arrears at notice');
  optionalMoney('current-rent', 'Enter a valid current rent');
  optionalMoney('arrears-issue', 'Enter valid arrears on issue');
  optionalMoney('last-payment', 'Enter a valid last payment');
  optionalMoney('arrears-today', 'Enter valid arrears today');
  return issues;
}

/** A long text box the page has whatever the order type: hearing notes, recitals or the staff message. */
function validateText(formData: Record<string, unknown>, id: string, name: string): MakeOrderValidationIssue[] {
  const { issues, maxLength } = validation(formData);
  maxLength(
    id,
    MAX_FREE_TEXT_LENGTH,
    `${name} must be ${MAX_FREE_TEXT_LENGTH.toLocaleString('en-GB')} characters or less`
  );
  return issues;
}

/** A ticked staff message needs a message, as well as fitting the length every long text box has. */
function validateStaffMessage(formData: Record<string, unknown>): MakeOrderValidationIssue[] {
  if (!value(formData, 'staff-message-text')) {
    return [{ id: 'staff-message-text', message: 'Enter a message for court staff' }];
  }
  return validateText(formData, 'staff-message-text', 'Staff message');
}

/** The checks particular to one kind of order. A switch, so an order type from the request only reaches these. */
function validateOrderType(orderType: MakeOrderType, formData: Record<string, unknown>): MakeOrderValidationIssue[] {
  switch (orderType) {
    case 'OUTRIGHT_POSSESSION':
      return validateOutright(formData);
    case 'SUSPENDED_POSSESSION':
      return validateSuspended(formData);
    case 'ADJOURNMENT':
      return validateAdjournment(formData);
    case 'STRIKE_OUT_DISMISSAL':
      return validateStrikeOut(formData);
    case 'FREE_FORM':
      return validateCosts(formData, false);
    default:
      throw new Error(`Unknown order type: ${orderType}`);
  }
}

export function validateMakeOrder(
  orderType: MakeOrderType,
  formData: Record<string, unknown>,
  parties: readonly AttendanceParty[]
): MakeOrderValidationIssue[] {
  const chosen = (name: string): boolean => values(formData, name).includes('yes');
  // In the order the page asks, so the error summary follows the page.
  return [
    ...validateCaseFacts(formData),
    ...validateText(formData, 'hearing-notes', 'Hearing notes'),
    ...validateAttendance(formData, parties),
    ...(chosen('recitals') ? validateText(formData, 'recitals-text', 'Recitals') : []),
    ...validateOrderType(orderType, formData),
    ...(chosen('staff-message') ? validateStaffMessage(formData) : []),
  ];
}
