import type { Request } from 'express';

import { shouldShowPriorityDebtDetailsStep } from '../../../../main/steps/respond-to-claim/flowConditions';

type FakeReq = Request & {
  res: { locals: { validatedCase: { data: Record<string, unknown> } } };
  body: Record<string, unknown>;
};

const makeReq = (
  householdCircumstances: Record<string, unknown> | undefined,
  body: Record<string, unknown> = {}
): FakeReq =>
  ({
    body,
    res: {
      locals: {
        validatedCase: {
          data: {
            possessionClaimResponse: {
              defendantResponses: {
                householdCircumstances,
              },
            },
          },
        },
      },
    },
  }) as unknown as FakeReq;

describe('shouldShowPriorityDebtDetailsStep', () => {
  it('returns false when finance details have not been provided', () => {
    const req = makeReq({});
    expect(shouldShowPriorityDebtDetailsStep(req)).toBe(false);
  });

  it('returns false when shareIncomeExpenseDetails is NO', () => {
    const req = makeReq({ shareIncomeExpenseDetails: 'NO' });
    expect(shouldShowPriorityDebtDetailsStep(req)).toBe(false);
  });

  it('returns true when user just submitted havePriorityDebts=yes', () => {
    const req = makeReq({ shareIncomeExpenseDetails: 'YES' }, { havePriorityDebts: 'yes' });
    expect(shouldShowPriorityDebtDetailsStep(req)).toBe(true);
  });

  it('returns true when validatedCase has debt amounts persisted', () => {
    const req = makeReq({ shareIncomeExpenseDetails: 'YES', priorityDebts: 'YES', debtTotal: '50000' });
    expect(shouldShowPriorityDebtDetailsStep(req)).toBe(true);
  });

  it('returns true when validatedCase has only debtContribution', () => {
    const req = makeReq({ shareIncomeExpenseDetails: 'YES', priorityDebts: 'YES', debtContribution: '5000' });
    expect(shouldShowPriorityDebtDetailsStep(req)).toBe(true);
  });

  it('returns true when validatedCase has only debtContributionFrequency', () => {
    const req = makeReq({
      shareIncomeExpenseDetails: 'YES',
      priorityDebts: 'YES',
      debtContributionFrequency: 'MONTHLY',
    });
    expect(shouldShowPriorityDebtDetailsStep(req)).toBe(true);
  });

  it('returns false when finance is provided but no priority-debt selection or data exists', () => {
    const req = makeReq({ shareIncomeExpenseDetails: 'YES' });
    expect(shouldShowPriorityDebtDetailsStep(req)).toBe(false);
  });

  it('returns false when user just submitted havePriorityDebts=no and no debt data persisted', () => {
    const req = makeReq({ shareIncomeExpenseDetails: 'YES' }, { havePriorityDebts: 'no' });
    expect(shouldShowPriorityDebtDetailsStep(req)).toBe(false);
  });
});
