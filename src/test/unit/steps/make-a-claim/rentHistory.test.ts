import {
  addRentTablePayment,
  formatPence,
  generateRentPeriods,
  ledgerWithArrears,
  mergeRentPeriods,
  rentTableWithArrears,
  statementRangeOf,
} from '../../../../main/steps/make-a-claim/rentHistory';

describe('generateRentPeriods', () => {
  const dueDates = (input: Parameters<typeof generateRentPeriods>[0]) =>
    generateRentPeriods(input).map(period => period.dateDue);

  it('lays out monthly rent on the due day of each month', () => {
    expect(
      dueDates({
        rentAmount: '100000',
        rentFrequency: 'MONTHLY',
        rentDueDay: 1,
        statementStart: '2026-06-01',
        statementEnd: '2026-08-31',
      })
    ).toEqual(['2026-06-01', '2026-07-01', '2026-08-01']);
  });

  it('starts monthly rent in the next month when the due day is before the start date', () => {
    expect(
      dueDates({
        rentAmount: '100000',
        rentFrequency: 'MONTHLY',
        rentDueDay: 5,
        statementStart: '2026-06-10',
        statementEnd: '2026-08-10',
      })
    ).toEqual(['2026-07-05', '2026-08-05']);
  });

  it('moves a due day a short month does not have to its last day', () => {
    expect(
      dueDates({
        rentAmount: '100000',
        rentFrequency: 'MONTHLY',
        rentDueDay: 31,
        statementStart: '2026-01-31',
        statementEnd: '2026-04-30',
      })
    ).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  });

  it('crosses into the next year', () => {
    expect(
      dueDates({
        rentAmount: '1',
        rentFrequency: 'MONTHLY',
        rentDueDay: 15,
        statementStart: '2025-11-15',
        statementEnd: '2026-01-15',
      })
    ).toEqual(['2025-11-15', '2025-12-15', '2026-01-15']);
  });

  it('uses the start day for monthly rent without a due day', () => {
    expect(
      dueDates({ rentAmount: '1', rentFrequency: 'MONTHLY', statementStart: '2026-03-20', statementEnd: '2026-04-30' })
    ).toEqual(['2026-03-20', '2026-04-20']);
  });

  it('lays out weekly and fortnightly rent from the start date', () => {
    const range = { rentAmount: '25000', statementStart: '2026-06-01', statementEnd: '2026-06-29' };
    expect(dueDates({ ...range, rentFrequency: 'WEEKLY' })).toEqual([
      '2026-06-01',
      '2026-06-08',
      '2026-06-15',
      '2026-06-22',
      '2026-06-29',
    ]);
    expect(dueDates({ ...range, rentFrequency: 'FORTNIGHTLY' })).toEqual(['2026-06-01', '2026-06-15', '2026-06-29']);
  });

  it('gives each period the rent due', () => {
    expect(
      generateRentPeriods({
        rentAmount: '25000',
        rentFrequency: 'WEEKLY',
        statementStart: '2026-06-01',
        statementEnd: '2026-06-01',
      })
    ).toEqual([{ periodStart: '2026-06-01', dateDue: '2026-06-01', amountDue: '25000' }]);
  });

  it.each([
    [
      'another frequency',
      { rentFrequency: 'OTHER' as const, statementStart: '2026-06-01', statementEnd: '2026-07-01' },
    ],
    [
      'an end before the start',
      { rentFrequency: 'WEEKLY' as const, statementStart: '2026-07-01', statementEnd: '2026-06-01' },
    ],
    [
      'a date that does not exist',
      { rentFrequency: 'WEEKLY' as const, statementStart: '2026-02-30', statementEnd: '2026-06-01' },
    ],
  ])('lays out nothing for %s', (_case, input) => {
    expect(generateRentPeriods({ rentAmount: '100', ...input })).toEqual([]);
  });

  it('stops at a limit of periods', () => {
    expect(
      generateRentPeriods({
        rentAmount: '1',
        rentFrequency: 'WEEKLY',
        statementStart: '2000-01-01',
        statementEnd: '2026-01-01',
      })
    ).toHaveLength(260);
  });
});

describe('mergeRentPeriods', () => {
  const july = { periodStart: '2026-07-15', dateDue: '2026-07-15', amountDue: '120000' };
  const august = { periodStart: '2026-08-15', dateDue: '2026-08-15', amountDue: '120000' };
  const row = (periodStart: string, datePaid: string, amountPaid: string, amountDue?: string) => ({
    value: { periodStart, ...(amountDue ? { dateDue: periodStart, amountDue } : {}), datePaid, amountPaid },
  });

  it('carries each payment to the latest period due on or before it was paid', () => {
    const merged = mergeRentPeriods(
      [july, august],
      [row('2026-07-01', '2026-07-20', '200', '100000'), row('2026-08-01', '2026-08-20', '300', '100000')]
    );
    expect(merged).toEqual([
      { value: { ...july, datePaid: '2026-07-20', amountPaid: '200' } },
      { value: { ...august, datePaid: '2026-08-20', amountPaid: '300' } },
    ]);
  });

  it('keeps payments made before or after the statement, and several in one period', () => {
    const merged = mergeRentPeriods(
      [july, august],
      [
        row('2026-06-01', '2026-06-02', '100', '100000'),
        row('2026-07-01', '2026-07-16', '200', '100000'),
        row('2026-07-01', '2026-07-30', '250'),
        row('2026-09-01', '2026-09-05', '400', '100000'),
      ]
    );
    expect(merged.map(item => [item.value.periodStart, item.value.amountPaid])).toEqual([
      ['2026-07-15', '100'],
      ['2026-07-15', '200'],
      ['2026-07-15', '250'],
      ['2026-08-15', '400'],
    ]);
    expect(merged.reduce((total, item) => total + Number(item.value.amountPaid ?? 0), 0)).toBe(950);
  });

  it('keeps the rows of the period that keeps its due date', () => {
    const merged = mergeRentPeriods([july], [{ id: 'keep', value: { ...july, amountDue: '100000' } }]);
    expect(merged).toEqual([{ id: 'keep', value: july }]);
  });

  it('leaves the statement alone when there are no periods to lay it out in', () => {
    const existing = [row('2026-07-01', '2026-07-02', '1', '1')];
    expect(mergeRentPeriods([], existing)).toBe(existing);
  });
});

describe('statementRangeOf', () => {
  const rows = ['2026-06-01', '2026-07-01', '2026-08-01'].map(periodStart => ({ value: { periodStart } }));

  it('covers up to the day before the next monthly due date', () => {
    expect(statementRangeOf(rows, { rentFrequency: 'MONTHLY', rentDueDay: 1 })).toEqual({
      statementStart: '2026-06-01',
      statementEnd: '2026-08-31',
    });
  });

  it('covers the last week or fortnight', () => {
    expect(statementRangeOf(rows, { rentFrequency: 'WEEKLY' })?.statementEnd).toBe('2026-08-07');
    expect(statementRangeOf(rows, { rentFrequency: 'FORTNIGHTLY' })?.statementEnd).toBe('2026-08-14');
  });

  it('has no range without periods', () => {
    expect(statementRangeOf([], { rentFrequency: 'MONTHLY' })).toBeUndefined();
  });
});

describe('rentTableWithArrears', () => {
  it('keeps a running total, listing extra payments under their period', () => {
    const lines = rentTableWithArrears([
      { value: { periodStart: '2026-07-01', dateDue: '2026-07-01', amountDue: '100000' } },
      { value: { periodStart: '2026-06-01', datePaid: '2026-06-15', amountPaid: '20000' } },
      {
        value: {
          periodStart: '2026-06-01',
          dateDue: '2026-06-01',
          amountDue: '100000',
          datePaid: '2026-06-05',
          amountPaid: '5000',
        },
      },
    ]);
    expect(lines.map(line => [line.rowIndex, line.isAdditionalPayment, line.arrears])).toEqual([
      [2, false, 95000],
      [1, true, 75000],
      [0, false, 175000],
    ]);
  });

  it('is empty without rows', () => {
    expect(rentTableWithArrears(undefined)).toEqual([]);
  });
});

describe('addRentTablePayment', () => {
  const rows = [{ value: { periodStart: '2026-06-01', dateDue: '2026-06-01', amountDue: '100000' } }];

  it('records the first payment on the period itself', () => {
    expect(addRentTablePayment(rows, '2026-06-01', { datePaid: '2026-06-05', amountPaid: '5000' })).toEqual([
      {
        value: {
          periodStart: '2026-06-01',
          dateDue: '2026-06-01',
          amountDue: '100000',
          datePaid: '2026-06-05',
          amountPaid: '5000',
        },
      },
    ]);
  });

  it('adds later payments as extra rows', () => {
    const once = addRentTablePayment(rows, '2026-06-01', { datePaid: '2026-06-05', amountPaid: '5000' });
    expect(addRentTablePayment(once, '2026-06-01', { datePaid: '2026-06-15', amountPaid: '20000' })[1]).toEqual({
      value: { periodStart: '2026-06-01', datePaid: '2026-06-15', amountPaid: '20000' },
    });
  });
});

describe('ledgerWithArrears', () => {
  it('orders transactions by date and keeps a running total of charges less payments', () => {
    const lines = ledgerWithArrears([
      { value: { transactionDate: '2026-07-01', transactionTypes: ['RENT_CHARGE'], amountCharged: '50000' } },
      { value: { transactionDate: '2026-06-01', transactionTypes: ['RENT_CHARGE'], amountCharged: '50000' } },
      { value: { transactionDate: '2026-06-03', transactionTypes: ['TENANT_PAYMENT'], amountPaid: '12000' } },
      {
        value: {
          transactionDate: '2026-07-01',
          transactionTypes: ['RENT_CHARGE', 'TENANT_PAYMENT'],
          amountCharged: '0',
          amountPaid: '50000',
        },
      },
    ]);
    expect(lines.map(line => [line.entryIndex, line.arrears])).toEqual([
      [1, 50000],
      [2, 38000],
      [0, 88000],
      [3, 38000],
    ]);
  });

  it('ignores an amount for a type the transaction is not', () => {
    const [line] = ledgerWithArrears([
      {
        value: {
          transactionDate: '2026-06-01',
          transactionTypes: ['TENANT_PAYMENT'],
          amountCharged: '999',
          amountPaid: '100',
        },
      },
    ]);
    expect(line).toMatchObject({ amountCharged: undefined, amountPaid: 100, arrears: -100 });
  });
});

describe('formatPence', () => {
  it('shows pence as pounds', () => {
    expect(formatPence(123456)).toBe('£1,234.56');
    expect(formatPence('5')).toBe('£0.05');
    expect(formatPence(undefined)).toBe('');
  });
});
