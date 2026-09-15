import { parseDate, parseMoney } from './makeOrderFormat';

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

function value(formData: Record<string, unknown>, name: string): string {
  return String(formData[name] ?? '').trim();
}

function values(formData: Record<string, unknown>, name: string): string[] {
  const raw = formData[name];
  return (Array.isArray(raw) ? raw : raw === undefined ? [] : [raw]).map(String);
}

function hasValidMoney(formData: Record<string, unknown>, name: string): boolean {
  return parseMoney(value(formData, name)) !== undefined;
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
  return {
    issues,
    add,
    money: (id: string, message: string): void => add(hasValidMoney(formData, id), id, message),
    date: (prefix: string, message: string): void => add(hasValidDate(formData, prefix), `${prefix}-day`, message),
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
  if (!values(formData, 'costs').includes('yes') || !amountType || hasValidMoney(formData, id)) {
    return [];
  }
  return [{ id, message: suspended ? `Enter a valid ${amountType} costs amount` : 'Enter a valid costs amount' }];
}

function validateSuspended(formData: Record<string, unknown>): MakeOrderValidationIssue[] {
  const { issues, add, money, date } = validation(formData);
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
    date('suspended-instalment-date', 'Enter a valid first instalment date');
  }
  if (options.includes('use-occupation')) {
    money('suspended-use-occupation-rate', 'Enter a valid daily rate for use and occupation');
    date('suspended-use-occupation-from-date', 'Enter a valid start date for use and occupation');
  }

  return [...issues, ...validateCosts(formData, true)];
}

function validateOutright(formData: Record<string, unknown>): MakeOrderValidationIssue[] {
  const { issues, add, money, date } = validation(formData);
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

  if (options.includes('money-judgment')) {
    const sections = values(formData, 'outright-mj-sections');
    add(
      sections.includes('arrears') || sections.includes('payment-plan'),
      'outright-mj-sections',
      'Select what the money judgment covers'
    );
    if (sections.includes('arrears')) {
      money('outright-mj-arrears', 'Enter a valid arrears amount');
      add(
        !value(formData, 'outright-mj-interest') || hasValidMoney(formData, 'outright-mj-interest'),
        'outright-mj-interest',
        'Enter a valid interest amount'
      );
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
        add(
          ['weekly', 'monthly'].includes(value(formData, 'outright-mj-inst-freq')),
          'outright-mj-inst-freq',
          'Select weekly or monthly instalments'
        );
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
  const { issues, add, money, date } = validation(formData);
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
      add(Boolean(value(formData, 'adj-specific-time')), 'adj-specific-time', 'Enter the time of hearing');
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
    const validatePayment = (option: string, prefix: string): void => {
      if (conditions.includes(option)) {
        money(`${prefix}-amount`, 'Enter a valid payment amount');
        date(`${prefix}-date`, 'Enter a valid payment date');
      }
    };
    validatePayment('current-rent-plus', 'adj-gen-current-rent-plus');
    validatePayment('payments', 'adj-gen-payments');
    validatePayment('oneoff', 'adj-gen-oneoff');
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

export function validateMakeOrder(
  orderType: MakeOrderType,
  formData: Record<string, unknown>
): MakeOrderValidationIssue[] {
  if (orderType === 'OUTRIGHT_POSSESSION') {
    return validateOutright(formData);
  }
  if (orderType === 'SUSPENDED_POSSESSION') {
    return validateSuspended(formData);
  }
  if (orderType === 'ADJOURNMENT') {
    return validateAdjournment(formData);
  }
  if (orderType === 'FREE_FORM' && !value(formData, 'free-form-text')) {
    return [{ id: 'free-form-text', message: 'Enter the order wording' }];
  }
  return [];
}
