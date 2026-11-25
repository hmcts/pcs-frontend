import {
  blankJudgment,
  judgmentsFromOrder,
  moneyJudgmentRows,
  moneyJudgmentsRequest,
  validateMoneyJudgments,
} from '@utils/moneyJudgments';

const sides = { claimants: ['c1'], defendants: ['d1', 'd2'] };

describe('moneyJudgments', () => {
  it('starts an outright order from the judge’s judgment for arrears, with the costs it orders paid on the same terms, against all the defendants', () => {
    const answers = judgmentsFromOrder(
      'OUTRIGHT_POSSESSION',
      {
        'outright-options': ['money-judgment'],
        'outright-mj-sections': ['arrears', 'payment-plan'],
        'outright-mj-arrears': '2,450',
        'outright-mj-interest': '12.50',
        'outright-mj-plan': ['lump', 'instalments'],
        'outright-mj-lump-amount': '100',
        'outright-mj-lump-date-day': '1',
        'outright-mj-lump-date-month': '12',
        'outright-mj-lump-date-year': '2026',
        'outright-mj-inst-amount': '50',
        'outright-mj-inst-freq': 'monthly',
        'outright-mj-inst-date-day': '1',
        'outright-mj-inst-date-month': '1',
        'outright-mj-inst-date-year': '2027',
        costs: 'yes',
        'costs-choice': 'def-pay-cl-fixed',
        'costs-def-pay-cl-fixed-amount': '355',
      },
      sides
    );

    expect(answers.costs).toBe('DEFENDANT_PAYS_FIXED');
    expect(moneyJudgmentsRequest(answers)).toEqual({
      costs: 'DEFENDANT_PAYS_FIXED',
      moneyJudgments: [
        {
          arrears: 2450,
          otherAmount: 12.5,
          oneOffAmount: 100,
          oneOffDate: '2026-12-01',
          instalmentAmount: 50,
          instalmentFrequency: 'MONTHLY',
          firstInstalmentDate: '2027-01-01',
          suspended: false,
          costs: 355,
          debtors: ['d1', 'd2'],
          creditors: ['c1'],
        },
      ],
    });
    expect(validateMoneyJudgments(answers)).toEqual([]);
  });

  it('suspends a suspended order’s judgment and costs on the same terms, and has the claimant pay the defendant’s costs', () => {
    const suspended = judgmentsFromOrder(
      'SUSPENDED_POSSESSION',
      {
        'suspended-options': ['money-judgment-arrears'],
        'suspended-arrears': '900',
        'suspended-mj-same-terms': 'yes',
        costs: 'yes',
        'costs-choice': 'summary-same-terms',
        'costs-summary-same-terms-amount': '200',
      },
      sides
    );
    expect(suspended.judgments.map(judgment => [judgment.arrears, judgment.costs, judgment.suspended])).toEqual([
      ['900', '', true],
      ['', '200', true],
    ]);

    const claimantPays = judgmentsFromOrder(
      'ADJOURNMENT',
      { costs: 'yes', 'costs-choice': 'cl-pay-def-summary', 'costs-cl-pay-def-summary-amount': '75' },
      sides
    );
    expect(claimantPays.judgments.map(judgment => [judgment.debtors, judgment.creditors])).toEqual([
      [['c1'], ['d1', 'd2']],
    ]);
  });

  it('makes no judgment where the judge made none, and says nothing about costs where they did not', () => {
    expect(judgmentsFromOrder('OUTRIGHT_POSSESSION', { 'outright-possession': 'forthwith' }, sides)).toEqual({
      costs: 'NONE',
      hasMoneyJudgments: 'no',
      judgments: [],
    });
    expect(moneyJudgmentsRequest({ costs: 'NONE', hasMoneyJudgments: 'no', judgments: [] })).toEqual({
      costs: undefined,
      moneyJudgments: [],
    });
  });

  it('asks who pays and is paid each judgment, its sum, and each way it is paid in full', () => {
    expect(validateMoneyJudgments({ judgments: [] }).map(issue => issue.message)).toEqual([
      'Select what the order says about costs',
      'Select if the order makes a money judgment',
    ]);

    const incomplete = {
      ...blankJudgment(sides),
      debtors: [],
      creditors: [],
      oneOffAmount: '10',
      instalmentAmount: 'lots',
    };
    const overlapping = { ...blankJudgment(sides), creditors: ['d1'], arrears: '10' };
    expect(
      validateMoneyJudgments({ costs: 'NONE', hasMoneyJudgments: 'yes', judgments: [incomplete, overlapping] }).map(
        issue => [issue.id, issue.message]
      )
    ).toEqual([
      ['judgment-1-debtors', 'Select who must pay money judgment 1'],
      ['judgment-1-creditors', 'Select who is paid money judgment 1'],
      ['judgment-1-arrears', 'Enter the sum of money judgment 1'],
      ['judgment-1-one-off-date-day', 'Enter a real date the one-off payment is due for money judgment 1'],
      ['judgment-1-instalment-amount', 'Enter a valid instalment for money judgment 1'],
      ['judgment-1-instalment-frequency', 'Select how often instalments of money judgment 1 are paid'],
      ['judgment-1-first-instalment-date-day', 'Enter a real date the first instalment is due for money judgment 1'],
      ['judgment-2-creditors', 'A party cannot both pay and be paid money judgment 2'],
    ]);
  });

  it('asks for the rest of the instalment terms when only how often is given', () => {
    const judgment = { ...blankJudgment(sides), arrears: '10', instalmentFrequency: 'WEEKLY' };
    expect(
      validateMoneyJudgments({ costs: 'NONE', hasMoneyJudgments: 'yes', judgments: [judgment] }).map(issue => issue.id)
    ).toEqual(['judgment-1-instalment-amount', 'judgment-1-first-instalment-date-day']);
  });

  it('says the date after a one-off payment is for the balance', () => {
    const judgment = {
      ...blankJudgment(sides),
      arrears: '900',
      oneOffAmount: '100',
      oneOffDate: { day: '1', month: '12', year: '2026' },
      payBy: { day: '1', month: '6', year: '2027' },
    };
    expect(
      moneyJudgmentRows({ costs: 'NONE', hasMoneyJudgments: 'yes', judgments: [judgment] }, id => id)[2][1]
    ).toEqual(expect.arrayContaining(['One-off payment: £100.00 by 1 December 2026', 'Balance by 1 June 2027']));
  });

  it('lists each judgment to check, naming its parties', () => {
    const names: Record<string, string> = {
      c1: 'Claimant 1: Housing Ltd',
      d1: 'Defendant 1: Jo',
      d2: 'Defendant 2: Sam',
    };
    expect(
      moneyJudgmentRows(
        {
          costs: 'RESERVED',
          hasMoneyJudgments: 'yes',
          judgments: [
            {
              ...blankJudgment(sides),
              arrears: '900',
              payBy: { day: '1', month: '3', year: '2027' },
              suspended: true,
            },
          ],
        },
        id => names[id]
      )
    ).toEqual([
      ['What does the order say about costs?', ['Costs reserved']],
      ['Does the order make a money judgment?', ['Yes']],
      [
        'Money judgment 1',
        [
          'Paid by: Defendant 1: Jo, Defendant 2: Sam',
          'Paid to: Claimant 1: Housing Ltd',
          'Arrears: £900.00',
          'To be paid in full by 1 March 2027',
          'Enforcement suspended on the terms of the possession order',
        ],
      ],
    ]);
  });
});
