import { deepNormaliseYesNoCasing } from '../../../main/services/ccdResponseNormaliser';

describe('deepNormaliseYesNoCasing', () => {
  it('uppercases PascalCase "Yes" and "No"', () => {
    expect(deepNormaliseYesNoCasing('Yes')).toBe('YES');
    expect(deepNormaliseYesNoCasing('No')).toBe('NO');
  });

  it('uppercases lowercase "yes" and "no"', () => {
    expect(deepNormaliseYesNoCasing('yes')).toBe('YES');
    expect(deepNormaliseYesNoCasing('no')).toBe('NO');
  });

  it('preserves already-uppercase values unchanged', () => {
    expect(deepNormaliseYesNoCasing('YES')).toBe('YES');
    expect(deepNormaliseYesNoCasing('NO')).toBe('NO');
  });

  it('trims whitespace around Yes/No before matching', () => {
    expect(deepNormaliseYesNoCasing('  Yes  ')).toBe('YES');
  });

  it('does not touch other strings (free-text fields)', () => {
    expect(deepNormaliseYesNoCasing('Yes I think so')).toBe('Yes I think so');
    expect(deepNormaliseYesNoCasing('NOT_SURE')).toBe('NOT_SURE');
    expect(deepNormaliseYesNoCasing('WEEKLY')).toBe('WEEKLY');
    expect(deepNormaliseYesNoCasing('asfsa')).toBe('asfsa');
    expect(deepNormaliseYesNoCasing('')).toBe('');
  });

  it('walks nested objects and arrays', () => {
    const input = {
      possessionClaimResponse: {
        defendantResponses: {
          householdCircumstances: {
            shareIncomeExpenseDetails: 'Yes',
            otherTenants: 'No',
            alternativeAccommodation: 'NOT_SURE',
            additionalCircumstancesDetails: 'asfsa',
          },
          claimGrounds: [
            { id: 'g1', selected: 'Yes' },
            { id: 'g2', selected: 'No' },
          ],
        },
      },
    };

    const result = deepNormaliseYesNoCasing(input);

    expect(result).toEqual({
      possessionClaimResponse: {
        defendantResponses: {
          householdCircumstances: {
            shareIncomeExpenseDetails: 'YES',
            otherTenants: 'NO',
            alternativeAccommodation: 'NOT_SURE',
            additionalCircumstancesDetails: 'asfsa',
          },
          claimGrounds: [
            { id: 'g1', selected: 'YES' },
            { id: 'g2', selected: 'NO' },
          ],
        },
      },
    });
  });

  it('preserves non-string scalar types', () => {
    expect(deepNormaliseYesNoCasing(42)).toBe(42);
    expect(deepNormaliseYesNoCasing(true)).toBe(true);
    expect(deepNormaliseYesNoCasing(false)).toBe(false);
    expect(deepNormaliseYesNoCasing(null)).toBe(null);
    expect(deepNormaliseYesNoCasing(undefined)).toBe(undefined);
  });

  it('does not mutate the input', () => {
    const input = { hc: { share: 'Yes' } };
    const result = deepNormaliseYesNoCasing(input);
    expect(input.hc.share).toBe('Yes');
    expect((result as typeof input).hc.share).toBe('YES');
  });
});
