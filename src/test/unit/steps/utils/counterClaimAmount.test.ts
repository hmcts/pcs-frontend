import { getCounterClaimAmountInPence } from '../../../../main/steps/utils/counterClaimAmount';

describe('getCounterClaimAmountInPence', () => {
  it('returns claimAmount when amount is known', () => {
    expect(
      getCounterClaimAmountInPence({
        isClaimAmountKnown: 'YES',
        claimAmount: '250000',
      })
    ).toBe('250000');
  });

  it('returns estimatedMaxClaimAmount when amount is not known', () => {
    expect(
      getCounterClaimAmountInPence({
        isClaimAmountKnown: 'NO',
        estimatedMaxClaimAmount: '500000',
      })
    ).toBe('500000');
  });

  it('returns undefined for something else or missing fields', () => {
    expect(getCounterClaimAmountInPence({})).toBeUndefined();
    expect(getCounterClaimAmountInPence()).toBeUndefined();
  });
});
