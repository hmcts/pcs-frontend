import {
  CURRENCY_INPUT_ATTRIBUTES,
  validateCurrencyAmount,
} from '../../../../../main/modules/steps/formBuilder/currencyValidation';

describe('CURRENCY_INPUT_ATTRIBUTES', () => {
  it('should set inputmode to numeric for mobile keyboard hint', () => {
    expect(CURRENCY_INPUT_ATTRIBUTES.inputmode).toBe('numeric');
  });

  it('should set spellcheck to false', () => {
    expect(CURRENCY_INPUT_ATTRIBUTES.spellcheck).toBe(false);
  });

  it('should have a pattern that matches valid currency values', () => {
    const pattern = new RegExp(`^${CURRENCY_INPUT_ATTRIBUTES.pattern as string}$`);
    expect(pattern.test('123')).toBe(true);
    expect(pattern.test('123.45')).toBe(true);
    expect(pattern.test('123.4')).toBe(true);
    expect(pattern.test('9999999999')).toBe(true);
    expect(pattern.test('9999999999.99')).toBe(true);
  });

  it('should have a pattern that rejects invalid currency values', () => {
    const pattern = new RegExp(`^${CURRENCY_INPUT_ATTRIBUTES.pattern as string}$`);
    expect(pattern.test('123.456')).toBe(false);
    expect(pattern.test('abc')).toBe(false);
    expect(pattern.test('')).toBe(false);
  });

  it('should stay in sync with validateCurrencyAmount format rule', () => {
    // Checks that the HTML pattern hint and server-side format validation agree on the same
    // format rules. Range bounds (min/max) are intentionally excluded here — they only apply
    // server-side and are not reflected in the input pattern attribute.
    const htmlPattern = new RegExp(`^${CURRENCY_INPUT_ATTRIBUTES.pattern as string}$`);
    const formatValidValues = ['1', '99', '123.45', '123.4', '0.5', '999999999.99'];
    const formatInvalidValues = ['123.456', 'abc', '12a.45'];

    for (const v of formatValidValues) {
      expect(htmlPattern.test(v)).toBe(true);
      expect(validateCurrencyAmount(v, { errorPrefix: 'errors.test' })).toBeUndefined();
    }

    for (const v of formatInvalidValues) {
      expect(htmlPattern.test(v)).toBe(false);
      expect(validateCurrencyAmount(v, { errorPrefix: 'errors.test' })).toBeDefined();
    }
  });
});

describe('validateCurrencyAmount', () => {
  const errorPrefix = 'errors.rentArrears';

  describe('valid inputs', () => {
    it('should return undefined for valid currency format (whole numbers and 1–2 decimal places, GOV.UK style)', () => {
      expect(validateCurrencyAmount('123.45', { errorPrefix })).toBeUndefined();
      expect(validateCurrencyAmount('123.4', { errorPrefix })).toBeUndefined();
      expect(validateCurrencyAmount('123', { errorPrefix })).toBeUndefined();
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
    it('should return format error for too many decimal places', () => {
      expect(validateCurrencyAmount('123.456', { errorPrefix })).toBe('errors.rentArrears.format');
    });

    it('should return format error for 11+ digit whole numbers (exceeds max, range check first)', () => {
      expect(validateCurrencyAmount('12345678901', { errorPrefix })).toBe('errors.rentArrears.largeAmount');
    });

    it('should return format error for non-numeric characters', () => {
      expect(validateCurrencyAmount('abc.de', { errorPrefix })).toBe('errors.rentArrears.format');
      expect(validateCurrencyAmount('12a.45', { errorPrefix })).toBe('errors.rentArrears.format');
    });

    it('should return large amount error for 11-digit numbers with decimals', () => {
      expect(validateCurrencyAmount('12345678901.00', { errorPrefix })).toBe('errors.rentArrears.largeAmount');
    });
  });

  describe('range validation', () => {
    it('should return negative error for values below minimum', () => {
      expect(validateCurrencyAmount('-1.00', { errorPrefix, min: 0 })).toBe('errors.rentArrears.negativeAmount');
      expect(validateCurrencyAmount('-100.50', { errorPrefix, min: 0 })).toBe('errors.rentArrears.negativeAmount');
    });

    it('should return large amount error for values above maximum', () => {
      expect(validateCurrencyAmount('1000000001.00', { errorPrefix, max: 1000000000 })).toBe(
        'errors.rentArrears.largeAmount'
      );
      expect(validateCurrencyAmount('50000000000.00', { errorPrefix, max: 1000000000 })).toBe(
        'errors.rentArrears.largeAmount'
      );
    });

    it('should use default min/max when not specified', () => {
      expect(validateCurrencyAmount('-1.00', { errorPrefix })).toBe('errors.rentArrears.negativeAmount');
      expect(validateCurrencyAmount('1000000001.00', { errorPrefix })).toBe('errors.rentArrears.largeAmount');
    });

    it('should accept custom min/max values', () => {
      expect(validateCurrencyAmount('5.00', { errorPrefix, min: 10, max: 100 })).toBe(
        'errors.rentArrears.negativeAmount'
      );
      expect(validateCurrencyAmount('150.00', { errorPrefix, min: 10, max: 100 })).toBe(
        'errors.rentArrears.largeAmount'
      );
      expect(validateCurrencyAmount('50.00', { errorPrefix, min: 10, max: 100 })).toBeUndefined();
    });
  });

  describe('error priority', () => {
    it('should prioritize range errors over format errors', () => {
      // Large number without proper format should return large amount error
      expect(validateCurrencyAmount('50000000000', { errorPrefix, max: 1000000000 })).toBe(
        'errors.rentArrears.largeAmount'
      );
      // Negative number without proper format should return negative error
      expect(validateCurrencyAmount('-100', { errorPrefix, min: 0 })).toBe('errors.rentArrears.negativeAmount');
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
    it('should use custom error prefix (generic keys reusable for any journey)', () => {
      const customPrefix = 'errors.customField';
      expect(validateCurrencyAmount('abc', { errorPrefix: customPrefix })).toBe('errors.customField.format');
      expect(validateCurrencyAmount('-1.00', { errorPrefix: customPrefix, min: 0 })).toBe(
        'errors.customField.negativeAmount'
      );
      expect(validateCurrencyAmount('999999999999.00', { errorPrefix: customPrefix, max: 1000000000 })).toBe(
        'errors.customField.largeAmount'
      );
    });
  });
});
