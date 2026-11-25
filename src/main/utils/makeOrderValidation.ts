import { DateTime } from 'luxon';

import {
  MAX_MONEY,
  NOTICE_DATE_PREFIXES,
  exceedsMaxMoney,
  parseDate,
  parseMoney,
  parseTime,
  timeEstimateOf,
} from './makeOrderFormat';

const DAY = 24 * 60 * 60 * 1000;

export const MAKE_ORDER_TYPES = [
  'OUTRIGHT_POSSESSION',
  'SUSPENDED_POSSESSION',
  'ADJOURNMENT',
  'STRIKE_OUT_DISMISSAL',
  'FREE_FORM',
  'NO_ORDER_ON_CLAIM',
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

/** The date the judge gave in the day, month and year fields, if it is a real one. */
function dateOf(formData: Record<string, unknown>, prefix: string): Date | undefined {
  return parseDate(
    value(formData, `${prefix}-day`),
    value(formData, `${prefix}-month`),
    value(formData, `${prefix}-year`)
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
    date: (prefix: string, message: string): void =>
      add(dateOf(formData, prefix) !== undefined, `${prefix}-day`, message),
    /** A date the judge need not give, but which must be valid if they start one. */
    optionalDate: (prefix: string, message: string): void =>
      add(
        !['day', 'month', 'year'].some(part => value(formData, `${prefix}-${part}`)) ||
          dateOf(formData, prefix) !== undefined,
        `${prefix}-day`,
        message
      ),
    frequency: (id: string, message: string): void =>
      add(PAYMENT_FREQUENCIES.includes(value(formData, id)), id, message),
  };
}

function validateCosts(formData: Record<string, unknown>, suspended: boolean): MakeOrderValidationIssue[] {
  const amountTypes: Partial<Record<string, string>> = {
    'def-pay-cl-fixed': 'fixed',
    'def-pay-cl-summary': 'summarily assessed',
    'cl-pay-def-summary': 'summarily assessed',
    ...(suspended ? { 'fixed-same-terms': 'fixed', 'summary-same-terms': 'summarily assessed' } : {}),
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

/** The arrears a suspension is conditional on and how they are paid, asked with ids that start with the prefix. */
function validatePaymentConditions(formData: Record<string, unknown>, prefix: string): MakeOrderValidationIssue[] {
  const { issues, add, money, date, frequency } = validation(formData);
  const terms = values(formData, `${prefix}-payment-terms`);

  money(`${prefix}-arrears`, 'Enter valid arrears');
  add(
    terms.includes('one-off') || terms.includes('instalments'),
    `${prefix}-payment-terms`,
    'Select a one-off payment or instalments'
  );
  if (terms.includes('one-off')) {
    money(`${prefix}-oneoff-amount`, 'Enter a valid one-off payment amount');
    date(`${prefix}-oneoff-date`, 'Enter a valid one-off payment date');
  }
  if (terms.includes('instalments')) {
    money(`${prefix}-instalment-amount`, 'Enter a valid instalment amount');
    frequency(`${prefix}-instalment-frequency`, 'Select weekly, fortnightly or monthly instalments');
    date(`${prefix}-instalment-date`, 'Enter a valid first instalment date');
  }
  return issues;
}

/** The time possession is ordered by, which the judge may leave blank. */
function possessionTime(formData: Record<string, unknown>, id: string): MakeOrderValidationIssue[] {
  const time = value(formData, id);
  return time && !parseTime(time) ? [{ id, message: 'Enter a valid time possession is ordered by, like 16:00' }] : [];
}

function validateSuspended(formData: Record<string, unknown>): MakeOrderValidationIssue[] {
  const { issues, date } = validation(formData);
  date('suspended-by-date', 'Enter a valid possession date');
  issues.push(...possessionTime(formData, 'suspended-by-time'));
  return [...issues, ...validatePaymentConditions(formData, 'suspended'), ...validateCosts(formData, true)];
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
    issues.push(...possessionTime(formData, 'outright-by-time'));
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
        'Select initial payment or instalment payments'
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

/** The listing questions the form asks with the prefix: the adjournment's, or a hearing listed without one. */
function validateListing(
  formData: Record<string, unknown>,
  prefix: string,
  dateMessage: string
): MakeOrderValidationIssue[] {
  const { issues, add, date } = validation(formData);
  const when = value(formData, `${prefix}-when`) || 'next-list';
  const hearingDate = `${prefix}-hearing-date-${when}`;
  const directions = values(formData, `${prefix}-directions`);
  date(hearingDate, dateMessage);
  add(
    Boolean(timeEstimateOf(name => value(formData, name), prefix)),
    `${prefix}-time-estimate-days`,
    'Enter the time estimate in whole days, hours and minutes, with minutes under 60'
  );
  if (when === 'specific') {
    const time = value(formData, `${prefix}-specific-time`);
    if (!time) {
      add(false, `${prefix}-specific-time`, 'Enter the time of hearing');
    } else {
      add(Boolean(parseTime(time)), `${prefix}-specific-time`, 'Enter a valid time of hearing, like 10:30am or 14:30');
    }
  }
  if (directions.includes('defence')) {
    date(`${prefix}-defence-date`, 'Enter a valid defence date');
  }
  if (directions.includes('counterclaim')) {
    date(`${prefix}-counterclaim-date`, 'Enter a valid counterclaim date');
  }
  if (directions.includes('claimant-reply')) {
    date(`${prefix}-claimant-reply-date`, 'Enter a valid counterclaim reply date');
  }
  add(
    !(directions.includes('defence') && directions.includes('counterclaim')),
    `${prefix}-directions`,
    'Select either defence or defence and any counterclaim, not both'
  );
  return issues;
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
    issues.push(...validateListing(formData, 'adj', 'Enter a valid adjournment date'));
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
  const subjects = values(formData, 'strike-subjects');
  add(subjects.length > 0, 'strike-subjects', 'Select what is struck out or dismissed');
  for (const subject of ['claim', 'counterclaim'].filter(chosen => subjects.includes(chosen))) {
    add(
      ['struck-out', 'dismissed'].includes(value(formData, `strike-${subject}-outcome`)),
      `strike-${subject}-outcome`,
      `Select whether the ${subject} is struck out or dismissed`
    );
  }
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
    }
    add(
      name.length <= MAX_ATTENDANCE_NAME_LENGTH,
      `${party.id}-name`,
      `Name for ${party.label} must be ${MAX_ATTENDANCE_NAME_LENGTH} characters or less`
    );
  }
  return issues;
}

export const APPLICATION_DECISIONS = [
  'none',
  'applicant-wording',
  'adjourn',
  'suspend',
  'dismiss',
  'strike-out',
  'list',
  'freeform',
] as const;

/** An open application the order can decide, whose answers start with `app-<id>`. */
export interface ApplicationToDecide {
  id: string;
  reference: string;
  enforcementSuspension?: boolean;
  adjournment?: boolean;
  /** Whether the applicant gave a draft order, which the order can take as its wording. */
  applicantWording?: boolean;
  /** The application the judge's task asked them to decide, which the order may not leave as it is. */
  required?: boolean;
}

/** The prefix of an application's answers on the make order form. */
export function applicationPrefix(application: { id: string }): string {
  return `app-${application.id}`;
}

/**
 * What the judge decides about each application, and what follows the decision: when the hearing is if they list
 * it, and for an application to suspend enforcement, the conditions if they suspend it. The order may leave any
 * application as it is but the one the judge's task asked them to decide.
 */
function validateApplications(
  formData: Record<string, unknown>,
  applications: readonly ApplicationToDecide[],
  withoutHearing: boolean,
  upcomingHearingIds: readonly string[]
): MakeOrderValidationIssue[] {
  const { issues, add } = validation(formData);
  for (const application of applications) {
    const prefix = applicationPrefix(application);
    const decision = value(formData, `${prefix}-decision`) || 'none';
    const allowed =
      (APPLICATION_DECISIONS as readonly string[]).includes(decision) &&
      !(application.required && decision === 'none') &&
      // Only an applicant who gave a draft order has wording to take, and only enforcement is suspended on conditions.
      !(decision === 'applicant-wording' && !application.applicantWording) &&
      !(decision === 'suspend' && !application.enforcementSuspension) &&
      !(decision === 'adjourn' && !application.adjournment) &&
      // Striking out is a decision on the papers, and never one on an application to suspend enforcement.
      !(decision === 'strike-out' && (!withoutHearing || application.enforcementSuspension));
    add(allowed, `${prefix}-decision`, `Select what you decide about application ${application.reference}`);
    // Listed at one of the case's hearings, the order only says which, so only a new hearing asks when.
    const listAt = value(formData, `${prefix}-list-at`) || 'new';
    if (decision === 'list' && listAt === 'new') {
      issues.push(...validateListing(formData, `${prefix}-list`, 'Enter a valid hearing date'));
    }
    // A hearing the order was drafted to list it at that has passed since is not one it can be heard at.
    add(
      decision !== 'list' || listAt === 'new' || upcomingHearingIds.includes(listAt),
      `${prefix}-list-at`,
      `The hearing application ${application.reference} is listed at has passed. Select another hearing`
    );
    if (decision === 'suspend') {
      issues.push(...validatePaymentConditions(formData, `${prefix}-suspension`));
    }
    if (decision === 'adjourn') {
      const adjournment = value(formData, `${prefix}-adjourn-type`);
      add(
        ['further-hearing', 'generally'].includes(adjournment),
        `${prefix}-adjourn-type`,
        'Select an adjournment type'
      );
      if (adjournment === 'further-hearing') {
        issues.push(...validateListing(formData, `${prefix}-adjourn`, 'Enter a valid hearing date'));
      }
    }
  }
  return issues;
}

/**
 * The hearing's record, by its fields' own names: the judge's own figures for the case and their note, which they
 * need not give, but which pcs-api records whenever they save, so are checked on every save.
 */
export function validateHearingRecord(formData: Record<string, unknown>): MakeOrderValidationIssue[] {
  const { issues, add, optionalMoney, optionalDate } = validation(formData);
  const today = DateTime.now().setZone('Europe/London');
  const tomorrow = Date.UTC(today.year, today.month - 1, today.day + 1);
  /** A date the judge need not give, which cannot be in the future, nor today unless `orToday`. */
  const pastDate = (prefix: string, invalid: string, notPast: string, orToday = false): void => {
    optionalDate(prefix, invalid);
    const date = dateOf(formData, prefix)?.getTime();
    add(date === undefined || date < tomorrow - (orToday ? 0 : DAY), `${prefix}-day`, notPast);
  };
  pastDate(
    'date-tenancy',
    'Enter a valid date of tenancy or contract',
    'Date of tenancy or contract must be in the past'
  );
  pastDate('date-notice', 'Enter a valid date of service of notice', 'Date of service of notice must be in the past');
  optionalMoney('arrears-notice', 'Enter valid arrears at notice');
  optionalMoney('current-rent', 'Enter a valid current rent');
  optionalMoney('arrears-issue', 'Enter valid arrears on issue');
  pastDate(
    'date-last-payment',
    'Enter a valid date of last payment',
    'Date of last payment must be today or in the past',
    true
  );
  optionalMoney('last-payment', 'Enter a valid last payment');
  optionalMoney('arrears-today', 'Enter valid arrears today');
  return [...issues, ...validateText(formData, 'notes', 'Hearing notes')];
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
      return [
        // Made without a hearing, a free form order can list one.
        ...(values(formData, 'list-on-notice').includes('yes')
          ? validateListing(formData, 'list', 'Enter a valid hearing date')
          : []),
        ...validateCosts(formData, false),
      ];
    case 'NO_ORDER_ON_CLAIM':
      return validateCosts(formData, false);
    default:
      throw new Error(`Unknown order type: ${orderType}`);
  }
}

export const APPLY_BY_PASSED =
  'The date by which a party may apply to set aside, vary or stay the order must be today or in the future';

function validateNotice(formData: Record<string, unknown>): MakeOrderValidationIssue[] {
  const prefix = NOTICE_DATE_PREFIXES[value(formData, 'order-notice')];
  if (!prefix) {
    return [];
  }
  const { issues, add, date } = validation(formData);
  date(prefix, 'Enter a real date by which a party may apply to set aside, vary or stay the order');
  const applyBy = dateOf(formData, prefix);
  // Parsed dates are UTC midnights, so today is the court's date as one too.
  const today = new Date(`${DateTime.now().setZone('Europe/London').toISODate()}T00:00:00Z`);
  add(!applyBy || applyBy >= today, `${prefix}-day`, APPLY_BY_PASSED);
  return issues;
}

export function validateMakeOrder(
  orderType: MakeOrderType,
  formData: Record<string, unknown>,
  parties: readonly AttendanceParty[],
  withoutHearing = false,
  applications: readonly ApplicationToDecide[] = [],
  upcomingHearingIds: readonly string[] = []
): MakeOrderValidationIssue[] {
  const chosen = (name: string): boolean => values(formData, name).includes('yes');
  // In the order the page asks, so the error summary follows the page.
  return [
    // No one attended an order made without a hearing, whose parties the caller leaves out.
    ...validateAttendance(formData, parties),
    ...(chosen('recitals') ? validateText(formData, 'recitals-text', 'Recitals') : []),
    ...validateOrderType(orderType, formData),
    ...validateApplications(formData, applications, withoutHearing, upcomingHearingIds),
    ...validateNotice(formData),
    ...(chosen('staff-message') ? validateStaffMessage(formData) : []),
  ];
}
