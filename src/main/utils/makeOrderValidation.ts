export type MakeOrderType =
  'OUTRIGHT_POSSESSION' | 'SUSPENDED_POSSESSION' | 'ADJOURNMENT' | 'STRIKE_OUT_DISMISSAL' | 'FREE_FORM';

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
  const amount = value(formData, name).split(',').join('');
  return /^\d+(\.\d{1,2})?$/.test(amount) && Number(amount) >= 0;
}

function hasValidDate(formData: Record<string, unknown>, prefix: string): boolean {
  const day = Number(value(formData, `${prefix}-day`));
  const month = Number(value(formData, `${prefix}-month`));
  const year = Number(value(formData, `${prefix}-year`));
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    day > 0 &&
    month > 0 &&
    year > 0 &&
    parsed.getUTCDate() === day &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCFullYear() === year
  );
}

function validateCosts(
  formData: Record<string, unknown>,
  amountFields: Partial<Record<string, MakeOrderValidationIssue>>
): MakeOrderValidationIssue[] {
  if (!values(formData, 'costs').includes('yes')) {
    return [];
  }

  const amountField = amountFields[value(formData, 'costs-choice')];
  if (!amountField) {
    return [];
  }

  return hasValidMoney(formData, amountField.id) ? [] : [amountField];
}

function validateSuspended(formData: Record<string, unknown>): MakeOrderValidationIssue[] {
  const issues: MakeOrderValidationIssue[] = [];
  const add = (valid: boolean, id: string, message: string): void => {
    if (!valid) {
      issues.push({ id, message });
    }
  };
  const terms = values(formData, 'suspended-payment-terms');
  const options = values(formData, 'suspended-options');

  add(hasValidDate(formData, 'suspended-by-date'), 'suspended-by-date-day', 'Enter a valid possession date');
  add(hasValidMoney(formData, 'suspended-arrears'), 'suspended-arrears', 'Enter valid arrears');
  add(
    terms.includes('one-off') || terms.includes('instalments'),
    'suspended-payment-terms',
    'Select a one-off payment or instalments'
  );
  if (terms.includes('one-off')) {
    add(
      hasValidMoney(formData, 'suspended-oneoff-amount'),
      'suspended-oneoff-amount',
      'Enter a valid one-off payment amount'
    );
    add(
      hasValidDate(formData, 'suspended-oneoff-date'),
      'suspended-oneoff-date-day',
      'Enter a valid one-off payment date'
    );
  }
  if (terms.includes('instalments')) {
    add(
      hasValidMoney(formData, 'suspended-instalment-amount'),
      'suspended-instalment-amount',
      'Enter a valid instalment amount'
    );
    add(
      hasValidDate(formData, 'suspended-instalment-date'),
      'suspended-instalment-date-day',
      'Enter a valid first instalment date'
    );
  }
  if (options.includes('use-occupation')) {
    add(
      hasValidMoney(formData, 'suspended-use-occupation-rate'),
      'suspended-use-occupation-rate',
      'Enter a valid daily rate for use and occupation'
    );
    add(
      hasValidDate(formData, 'suspended-use-occupation-from-date'),
      'suspended-use-occupation-from-date-day',
      'Enter a valid start date for use and occupation'
    );
  }

  return [
    ...issues,
    ...validateCosts(formData, {
      'def-pay-cl-fixed': {
        id: 'costs-def-pay-cl-fixed-amount',
        message: 'Enter a valid fixed costs amount',
      },
      'def-pay-cl-summary': {
        id: 'costs-def-pay-cl-summary-amount',
        message: 'Enter a valid summary assessed costs amount',
      },
      'cl-pay-def-summary': {
        id: 'costs-cl-pay-def-summary-amount',
        message: 'Enter a valid summary assessed costs amount',
      },
      'fixed-same-terms': {
        id: 'costs-fixed-same-terms-amount',
        message: 'Enter a valid fixed costs amount',
      },
      'summary-same-terms': {
        id: 'costs-summary-same-terms-amount',
        message: 'Enter a valid summary assessed costs amount',
      },
    }),
  ];
}

function validateOutright(formData: Record<string, unknown>): MakeOrderValidationIssue[] {
  const issues: MakeOrderValidationIssue[] = [];
  const add = (valid: boolean, id: string, message: string): void => {
    if (!valid) {
      issues.push({ id, message });
    }
  };
  const possession = value(formData, 'outright-possession');
  const options = values(formData, 'outright-options');

  add(
    possession === 'forthwith' || possession === 'by',
    'outright-possession',
    'Select when the defendant must give up possession'
  );
  if (possession === 'by') {
    add(hasValidDate(formData, 'outright-by-date'), 'outright-by-date-day', 'Enter a valid possession date');
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
      add(
        hasValidMoney(formData, 'outright-mj-arrears'),
        'outright-mj-arrears',
        'Enter a valid arrears amount'
      );
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
        add(
          hasValidMoney(formData, 'outright-mj-lump-amount'),
          'outright-mj-lump-amount',
          'Enter a valid payment amount'
        );
        add(
          hasValidDate(formData, 'outright-mj-lump-date'),
          'outright-mj-lump-date-day',
          'Enter a valid payment date'
        );
        if (values(formData, 'outright-mj-balance').includes('yes')) {
          add(
            hasValidDate(formData, 'outright-mj-balance-date'),
            'outright-mj-balance-date-day',
            'Enter a valid balance payment date'
          );
        }
      }
      if (plans.includes('instalments')) {
        add(
          hasValidMoney(formData, 'outright-mj-inst-amount'),
          'outright-mj-inst-amount',
          'Enter a valid instalment amount'
        );
        add(
          ['weekly', 'monthly'].includes(value(formData, 'outright-mj-inst-freq')),
          'outright-mj-inst-freq',
          'Select weekly or monthly instalments'
        );
        add(
          hasValidDate(formData, 'outright-mj-inst-date'),
          'outright-mj-inst-date-day',
          'Enter a valid first instalment date'
        );
      }
    }
  }

  if (options.includes('use-occupation')) {
    add(
      hasValidMoney(formData, 'outright-use-occupation-rate'),
      'outright-use-occupation-rate',
      'Enter a valid daily rate for use and occupation'
    );
    add(
      hasValidDate(formData, 'outright-use-occupation-from-date'),
      'outright-use-occupation-from-date-day',
      'Enter a valid start date for use and occupation'
    );
  }

  return issues;
}

function validateAdjournment(formData: Record<string, unknown>): MakeOrderValidationIssue[] {
  const issues: MakeOrderValidationIssue[] = [];
  const add = (valid: boolean, id: string, message: string): void => {
    if (!valid) {
      issues.push({ id, message });
    }
  };
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
    add(hasValidDate(formData, hearingDate), `${hearingDate}-day`, 'Enter a valid adjournment date');
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
      add(hasValidDate(formData, 'adj-defence-date'), 'adj-defence-date-day', 'Enter a valid defence date');
    }
    if (directions.includes('counterclaim')) {
      add(
        hasValidDate(formData, 'adj-counterclaim-date'),
        'adj-counterclaim-date-day',
        'Enter a valid counterclaim date'
      );
    }
    if (directions.includes('claimant-reply')) {
      add(
        hasValidDate(formData, 'adj-claimant-reply-date'),
        'adj-claimant-reply-date-day',
        'Enter a valid counterclaim reply date'
      );
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
        add(hasValidMoney(formData, `${prefix}-amount`), `${prefix}-amount`, 'Enter a valid payment amount');
        add(hasValidDate(formData, `${prefix}-date`), `${prefix}-date-day`, 'Enter a valid payment date');
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
      add(
        hasValidDate(formData, 'adj-gen-restore-date'),
        'adj-gen-restore-date-day',
        'Enter a valid restore application date'
      );
    }
  }

  return [
    ...issues,
    ...validateCosts(formData, {
      'def-pay-cl-fixed': {
        id: 'costs-def-pay-cl-fixed-amount',
        message: 'Enter a valid costs amount',
      },
      'def-pay-cl-summary': {
        id: 'costs-def-pay-cl-summary-amount',
        message: 'Enter a valid costs amount',
      },
      'cl-pay-def-summary': {
        id: 'costs-cl-pay-def-summary-amount',
        message: 'Enter a valid costs amount',
      },
    }),
  ];
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
