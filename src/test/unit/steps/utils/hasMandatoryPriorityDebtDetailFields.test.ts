import { hasMandatoryPriorityDebtDetailFields } from '../../../../main/steps/utils/hasMandatoryPriorityDebtDetailFields';

describe('hasMandatoryPriorityDebtDetailFields', () => {
  it('requires both amounts and a valid frequency', () => {
    expect(hasMandatoryPriorityDebtDetailFields(undefined)).toBe(false);
    expect(
      hasMandatoryPriorityDebtDetailFields({
        debtTotal: '123456',
        debtContribution: '100000',
      })
    ).toBe(false);
    expect(
      hasMandatoryPriorityDebtDetailFields({
        debtTotal: '123456',
        debtContribution: '100000',
        debtContributionFrequency: 'WEEKLY',
      })
    ).toBe(true);
  });
});
