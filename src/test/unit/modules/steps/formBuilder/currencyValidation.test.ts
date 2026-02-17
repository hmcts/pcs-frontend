import { validateCurrencyAmount } from '../../../../../main/modules/steps/formBuilder/currencyValidation';

describe('validateCurrencyAmount', () => {
  const errorPrefix = 'errors.rentArrears';

  describe('valid inputs', () => {
    it('should return undefined for valid currency format', () => {
      expect(validateCurrencyAmount('123.45', { errorPrefix })).toBeUndefined();
      expect(validateCurrencyAmount('0.00', { errorPrefix })).toBeUndefined();
      expect(validateCurrencyAmount('1000000000.00', { errorPrefix })).toBeUndefined();
      expect(validateCurrencyAmount('999999999.99', { errorPrefix })).toBeUndefined();
    });

    it('should handle values with commas', () => {
      expect(validateCurrencyAmount('1,234.56', { errorPrefix })).toBeUndefined();
      expect(validateCurrencyAmount('1,000,000.00', { errorPrefix })).toBeUndefined();
    });

    it('should return undefined for non-string values', () => {
      expect(validateCurrencyAmount(123, { errorPrefix })).toBeUndefined();
      expect(validateCurrencyAmount(null, { errorPrefix })).toBeUndefined();
      expect(validateCurrencyAmount(undefined, { errorPrefix })).toBeUndefined();
    });

    it('should return undefined for empty strings', () => {
      expect(validateCurrencyAmount('', { errorPrefix })).toBeUndefined();
      expect(validateCurrencyAmount('   ', { errorPrefix })).toBeUndefined();
    });
  });

  describe('format validation', () => {
    it('should return format error for missing decimal places', () => {
      expect(validateCurrencyAmount('123', { errorPrefix })).toBe('errors.rentArrears.rentArrearsFormat');
      expect(validateCurrencyAmount('123.4', { errorPrefix })).toBe('errors.rentArrears.rentArrearsFormat');
    });

    it('should return format error for too many decimal places', () => {
      expect(validateCurrencyAmount('123.456', { errorPrefix })).toBe('errors.rentArrears.rentArrearsFormat');
    });

    it('should return format error for missing decimal point', () => {
      expect(validateCurrencyAmount('12345', { errorPrefix })).toBe('errors.rentArrears.rentArrearsFormat');
    });

    it('should return format error for non-numeric characters', () => {
      expect(validateCurrencyAmount('abc.de', { errorPrefix })).toBe('errors.rentArrears.rentArrearsFormat');
      expect(validateCurrencyAmount('12a.45', { errorPrefix })).toBe('errors.rentArrears.rentArrearsFormat');
    });

    it('should return large amount error for 11-digit numbers', () => {
      // 11-digit numbers exceed the default max of 1 billion, so range check triggers first
      expect(validateCurrencyAmount('12345678901.00', { errorPrefix })).toBe('errors.rentArrears.rentArrearsLargeAmount');
    });
  });

  describe('range validation', () => {
    it('should return negative error for values below minimum', () => {
      expect(validateCurrencyAmount('-1.00', { errorPrefix, min: 0 })).toBe(
        'errors.rentArrears.rentArrearsNegativeAmount'
      );
      expect(validateCurrencyAmount('-100.50', { errorPrefix, min: 0 })).toBe(
        'errors.rentArrears.rentArrearsNegativeAmount'
      );
    });

    it('should return large amount error for values above maximum', () => {
      expect(validateCurrencyAmount('1000000001.00', { errorPrefix, max: 1000000000 })).toBe(
        'errors.rentArrears.rentArrearsLargeAmount'
      );
      expect(validateCurrencyAmount('50000000000.00', { errorPrefix, max: 1000000000 })).toBe(
        'errors.rentArrears.rentArrearsLargeAmount'
      );
    });

    it('should use default min/max when not specified', () => {
      expect(validateCurrencyAmount('-1.00', { errorPrefix })).toBe('errors.rentArrears.rentArrearsNegativeAmount');
      expect(validateCurrencyAmount('1000000001.00', { errorPrefix })).toBe(
        'errors.rentArrears.rentArrearsLargeAmount'
      );
    });

    it('should accept custom min/max values', () => {
      expect(validateCurrencyAmount('5.00', { errorPrefix, min: 10, max: 100 })).toBe(
        'errors.rentArrears.rentArrearsNegativeAmount'
      );
      expect(validateCurrencyAmount('150.00', { errorPrefix, min: 10, max: 100 })).toBe(
        'errors.rentArrears.rentArrearsLargeAmount'
      );
      expect(validateCurrencyAmount('50.00', { errorPrefix, min: 10, max: 100 })).toBeUndefined();
    });
  });

  describe('error priority', () => {
    it('should prioritize range errors over format errors', () => {
      // Large number without proper format should return large amount error
      expect(validateCurrencyAmount('50000000000', { errorPrefix, max: 1000000000 })).toBe(
        'errors.rentArrears.rentArrearsLargeAmount'
      );
      // Negative number without proper format should return negative error
      expect(validateCurrencyAmount('-100', { errorPrefix, min: 0 })).toBe(
        'errors.rentArrears.rentArrearsNegativeAmount'
      );
    });
  });

  describe('edge cases', () => {
    it('should handle boundary values correctly', () => {
      expect(validateCurrencyAmount('0.00', { errorPrefix, min: 0 })).toBeUndefined();
      expect(validateCurrencyAmount('1000000000.00', { errorPrefix, max: 1000000000 })).toBeUndefined();
    });

    it('should trim whitespace', () => {
      expect(validateCurrencyAmount('  123.45  ', { errorPrefix })).toBeUndefined();
      expect(validateCurrencyAmount('\t100.00\n', { errorPrefix })).toBeUndefined();
    });

    it('should handle values with multiple commas', () => {
      expect(validateCurrencyAmount('1,234,567.89', { errorPrefix })).toBeUndefined();
    });
  });

  describe('custom error prefixes', () => {
    it('should use custom error prefix', () => {
      const customPrefix = 'errors.customField';
      expect(validateCurrencyAmount('abc', { errorPrefix: customPrefix })).toBe('errors.customField.rentArrearsFormat');
      expect(validateCurrencyAmount('-1.00', { errorPrefix: customPrefix, min: 0 })).toBe(
        'errors.customField.rentArrearsNegativeAmount'
      );
      expect(validateCurrencyAmount('999999999999.00', { errorPrefix: customPrefix, max: 1000000000 })).toBe(
        'errors.customField.rentArrearsLargeAmount'
      );
    });
  });
});
