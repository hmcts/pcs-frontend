import { validateAmount } from '../../../../main/constants/validation';

describe('validateAmount', () => {
  const errorKeys = {
    invalidAmountFormatError: 'Enter an amount in the correct format, for example 148 or 148.50',
    minAmountError: 'The amount you entered must be £0.00 or above',
    maxAmountError: 'The amount you entered must be less than £1 billion',
  };

  it('returns true for a whole number', () => {
    expect(validateAmount('1000', errorKeys)).toBe(true);
  });

  it('returns true for an amount with exactly 2 decimal places', () => {
    expect(validateAmount('1000.50', errorKeys)).toBe(true);
  });

  it('returns true for an amount with commas', () => {
    expect(validateAmount('1,000', errorKeys)).toBe(true);
  });

  it('returns true for an amount with commas and 2 decimal places', () => {
    expect(validateAmount('1,000.50', errorKeys)).toBe(true);
  });

  it('returns invalid format for 1 decimal place', () => {
    expect(validateAmount('1000.0', errorKeys)).toBe(
      'Enter an amount in the correct format, for example 148 or 148.50'
    );
  });

  it('returns invalid format for more than 2 decimal places', () => {
    expect(validateAmount('1000.500', errorKeys)).toBe(
      'Enter an amount in the correct format, for example 148 or 148.50'
    );
  });

  it('returns invalid format for non-numeric characters', () => {
    expect(validateAmount('10a.00', errorKeys)).toBe(
      'Enter an amount in the correct format, for example 148 or 148.50'
    );
  });

  it('returns negative error for negative values', () => {
    expect(validateAmount('-1.00', errorKeys)).toBe('The amount you entered must be £0.00 or above');
  });

  it('returns large amount error for 1 billion or more', () => {
    expect(validateAmount('1000000000', errorKeys)).toBe('The amount you entered must be less than £1 billion');
  });

  it('returns true for empty input so required validation can handle it', () => {
    expect(validateAmount('', errorKeys)).toBe(true);
    expect(validateAmount('   ', errorKeys)).toBe(true);
  });

  it('returns true for non-string input', () => {
    expect(validateAmount(undefined, errorKeys)).toBe(true);
    expect(validateAmount(null, errorKeys)).toBe(true);
    expect(validateAmount(1000, errorKeys)).toBe(true);
    expect(validateAmount(1000.5, errorKeys)).toBe(true);
  });
});
