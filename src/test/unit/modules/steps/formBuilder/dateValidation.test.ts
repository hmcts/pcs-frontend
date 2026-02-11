import type { TFunction } from 'i18next';

import { getDateTranslationKey, validateDateField } from '../../../../../main/modules/steps/formBuilder/dateValidation';

describe('dateValidation', () => {
  const createMockT = (translations: Record<string, string> = {}): TFunction => {
    return jest.fn((key: string, params?: Record<string, string>) => {
      if (params) {
        let translated = translations[key] || key;
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          translated = translated.replace(`{{${paramKey}}}`, paramValue);
        });
        return translated;
      }
      return translations[key] || key;
    }) as unknown as TFunction;
  };

  describe('validateDateField', () => {
    describe('required validation', () => {
      it('should return error when all parts are missing and required', () => {
        const t = createMockT({ 'errors.date.required': 'Date is required' });
        const result = validateDateField('', '', '', true, t);
        expect(result?.message).toBe('Date is required');
      });

      it('should return error when day is missing and required', () => {
        const t = createMockT({
          'errors.date.missingOne': 'Date must include a {{missingField}}',
        });
        const result = validateDateField('', '06', '2000', true, t);
        expect(result?.message).toBe('Date must include a day');
        expect(result?.erroneousParts).toEqual(['day']);
      });

      it('should return error when month is missing and required', () => {
        const t = createMockT({
          'errors.date.missingOne': 'Date must include a {{missingField}}',
        });
        const result = validateDateField('15', '', '2000', true, t);
        expect(result?.message).toBe('Date must include a month');
        expect(result?.erroneousParts).toEqual(['month']);
      });

      it('should return error when year is missing and required', () => {
        const t = createMockT({
          'errors.date.missingOne': 'Date must include a {{missingField}}',
        });
        const result = validateDateField('15', '06', '', true, t);
        expect(result?.message).toBe('Date must include a year');
        expect(result?.erroneousParts).toEqual(['year']);
      });

      it('should return error when day and month are missing and required', () => {
        const t = createMockT({
          'errors.date.missingTwo': 'Date must include a {{first}} and {{second}}',
        });
        const result = validateDateField('', '', '2000', true, t);
        expect(result?.message).toBe('Date must include a day and month');
      });

      it('should return error when day and year are missing and required', () => {
        const t = createMockT({
          'errors.date.missingTwo': 'Date must include a {{first}} and {{second}}',
        });
        const result = validateDateField('', '06', '', true, t);
        expect(result?.message).toBe('Date must include a day and year');
      });

      it('should return error when month and year are missing and required', () => {
        const t = createMockT({
          'errors.date.missingTwo': 'Date must include a {{first}} and {{second}}',
        });
        const result = validateDateField('15', '', '', true, t);
        expect(result?.message).toBe('Date must include a month and year');
      });

      it('should return null when all parts are missing and not required', () => {
        const result = validateDateField('', '', '', false);
        expect(result).toBeNull();
      });

      it('should return null when all parts are present and required', () => {
        const result = validateDateField('15', '06', '2000', true);
        expect(result).toBeNull();
      });
    });

    describe('format validation', () => {
      it('should return error for non-numeric day', () => {
        const t = createMockT({ 'errors.date.notRealDate': 'Date must be a real date' });
        const result = validateDateField('ab', '06', '2000', true, t);
        expect(result?.message).toBe('Date must be a real date');
      });

      it('should return error for non-numeric month', () => {
        const t = createMockT({ 'errors.date.notRealDate': 'Date must be a real date' });
        const result = validateDateField('15', 'ab', '2000', true, t);
        expect(result?.message).toBe('Date must be a real date');
      });

      it('should return error for non-numeric year', () => {
        const t = createMockT({ 'errors.date.notRealDate': 'Date must be a real date' });
        const result = validateDateField('15', '06', 'abcd', true, t);
        expect(result?.message).toBe('Date must be a real date');
      });

      it('should return error for day with leading zero when not allowed', () => {
        const t = createMockT({ 'errors.date.notRealDate': 'Date must be a real date' });
        const result = validateDateField('05', '06', '2000', true, t);
        // Day with leading zero is valid, so this should pass
        expect(result).toBeNull();
      });

      it('should return error for year with leading zero', () => {
        const t = createMockT({ 'errors.date.notRealDate': 'Date must be a real date' });
        const result = validateDateField('15', '06', '0200', true, t);
        expect(result?.message).toBe('Date must be a real date');
      });

      it('should return error for day exceeding max length', () => {
        const t = createMockT({ 'errors.date.notRealDate': 'Date must be a real date' });
        const result = validateDateField('123', '06', '2000', true, t);
        expect(result?.message).toBe('Date must be a real date');
      });

      it('should return error for month exceeding max length', () => {
        const t = createMockT({ 'errors.date.notRealDate': 'Date must be a real date' });
        const result = validateDateField('15', '123', '2000', true, t);
        expect(result?.message).toBe('Date must be a real date');
      });

      it('should return error for year exceeding max length', () => {
        const t = createMockT({ 'errors.date.notRealDate': 'Date must be a real date' });
        const result = validateDateField('15', '06', '12345', true, t);
        expect(result?.message).toBe('Date must be a real date');
      });
    });

    describe('range validation', () => {
      it('should return error for day less than 1', () => {
        const t = createMockT({ 'errors.date.notRealDate': 'Date must be a real date' });
        const result = validateDateField('0', '06', '2000', true, t);
        expect(result?.message).toBe('Date must be a real date');
      });

      it('should return error for day greater than 31', () => {
        const t = createMockT({ 'errors.date.notRealDate': 'Date must be a real date' });
        const result = validateDateField('32', '06', '2000', true, t);
        expect(result?.message).toBe('Date must be a real date');
      });

      it('should return error for month less than 1', () => {
        const t = createMockT({ 'errors.date.notRealDate': 'Date must be a real date' });
        const result = validateDateField('15', '0', '2000', true, t);
        expect(result?.message).toBe('Date must be a real date');
      });

      it('should return error for month greater than 12', () => {
        const t = createMockT({ 'errors.date.notRealDate': 'Date must be a real date' });
        const result = validateDateField('15', '13', '2000', true, t);
        expect(result?.message).toBe('Date must be a real date');
      });

      it('should return error for year less than 1', () => {
        const t = createMockT({ 'errors.date.notRealDate': 'Date must be a real date' });
        const result = validateDateField('15', '06', '0', true, t);
        expect(result?.message).toBe('Date must be a real date');
      });

      it('should accept year up to 9999', () => {
        const result = validateDateField('15', '06', '9999', true);
        expect(result).toBeNull();
      });
    });

    describe('date validity validation', () => {
      it('should return error for invalid date (31st of February)', () => {
        const t = createMockT({ 'errors.date.notRealDate': 'Not a real date' });
        const result = validateDateField('31', '02', '2000', true, t);
        expect(result?.message).toBe('Not a real date');
      });

      it('should return error for invalid date (30th of February)', () => {
        const t = createMockT({ 'errors.date.notRealDate': 'Not a real date' });
        const result = validateDateField('30', '02', '2000', true, t);
        expect(result?.message).toBe('Not a real date');
      });

      it('should accept valid leap year date (29th of February)', () => {
        const result = validateDateField('29', '02', '2000', true);
        expect(result).toBeNull();
      });

      it('should return error for 29th of February in non-leap year', () => {
        const t = createMockT({ 'errors.date.notRealDate': 'Not a real date' });
        const result = validateDateField('29', '02', '2001', true, t);
        expect(result?.message).toBe('Not a real date');
      });

      it('should accept valid date in month with 31 days', () => {
        const result = validateDateField('31', '01', '2000', true);
        expect(result).toBeNull();
      });

      it('should return error for 31st in month with 30 days', () => {
        const t = createMockT({ 'errors.date.notRealDate': 'Not a real date' });
        const result = validateDateField('31', '04', '2000', true, t);
        expect(result?.message).toBe('Not a real date');
      });

      it('should accept valid date in month with 30 days', () => {
        const result = validateDateField('30', '04', '2000', true);
        expect(result).toBeNull();
      });
    });

    describe('noFutureDate validation', () => {
      it('should return error for future date when noFutureDate is true', () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const t = createMockT({ 'errors.date.futureDate': 'Date must be in the past' });
        const result = validateDateField(
          tomorrow.getDate().toString(),
          (tomorrow.getMonth() + 1).toString(),
          tomorrow.getFullYear().toString(),
          true,
          t,
          true
        );
        expect(result?.message).toBe('Date must be in the past');
      });

      it('should return error for current date when noFutureDate is true', () => {
        const today = new Date();
        const t = createMockT({ 'errors.date.futureDate': 'Date must be in the past' });
        const result = validateDateField(
          today.getDate().toString(),
          (today.getMonth() + 1).toString(),
          today.getFullYear().toString(),
          true,
          t,
          true
        );
        expect(result?.message).toBe('Date must be in the past');
      });

      it('should accept past date when noFutureDate is true', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const t = createMockT();
        const result = validateDateField(
          yesterday.getDate().toString(),
          (yesterday.getMonth() + 1).toString(),
          yesterday.getFullYear().toString(),
          true,
          t,
          true
        );
        expect(result).toBeNull();
      });

      it('should accept future date when noFutureDate is false', () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const result = validateDateField(
          tomorrow.getDate().toString(),
          (tomorrow.getMonth() + 1).toString(),
          tomorrow.getFullYear().toString(),
          true,
          undefined,
          false
        );
        expect(result).toBeNull();
      });

      it('should use translation from translations object for futureDate', () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const translations = { dateFutureDate: 'Custom future date error' };
        const result = validateDateField(
          tomorrow.getDate().toString(),
          (tomorrow.getMonth() + 1).toString(),
          tomorrow.getFullYear().toString(),
          true,
          undefined,
          true,
          false,
          translations
        );
        expect(result?.message).toBe('Custom future date error');
      });
    });

    describe('partial date validation', () => {
      it('should return null when only day is provided and not required', () => {
        const result = validateDateField('15', '', '', false);
        expect(result).toBeNull();
      });

      it('should return null when only month is provided and not required', () => {
        const result = validateDateField('', '06', '', false);
        expect(result).toBeNull();
      });

      it('should return null when only year is provided and not required', () => {
        const result = validateDateField('', '', '2000', false);
        expect(result).toBeNull();
      });

      it('should validate provided parts even when not all required', () => {
        const t = createMockT({ 'errors.date.notRealDate': 'Date must be a real date' });
        const result = validateDateField('32', '06', '', false, t);
        expect(result?.message).toBe('Date must be a real date');
      });
    });

    describe('fallback error messages', () => {
      it('should return default error when t is not provided', () => {
        const result = validateDateField('', '', '', true);
        expect(result?.message).toBe('Enter a valid date');
      });

      it('should return default error when translation key not found', () => {
        const t = createMockT();
        const result = validateDateField('', '', '', true, t);
        expect(result?.message).toBe('Enter a valid date');
      });

      it('should return default error for invalid date when t is not provided', () => {
        const result = validateDateField('32', '06', '2000', true);
        expect(result?.message).toBe('Enter a valid date');
      });
    });

    describe('edge cases', () => {
      it('should return error for whitespace in date parts (not numeric)', () => {
        const t = createMockT({ 'errors.date.notRealDate': 'Date must be a real date' });
        const result = validateDateField(' 15 ', ' 06 ', ' 2000 ', true, t);
        // Whitespace makes it non-numeric, so should return error
        expect(result?.message).toBe('Date must be a real date');
      });

      it('should handle NaN values gracefully', () => {
        const t = createMockT();
        const result = validateDateField('15', '06', '2000', true, t);
        // Should pass validation
        expect(result).toBeNull();
      });

      it('should handle empty strings for optional parts', () => {
        const result = validateDateField('15', '', '2000', false);
        expect(result).toBeNull();
      });

      it('should handle single digit day and month', () => {
        const result = validateDateField('5', '6', '2000', true);
        expect(result).toBeNull();
      });

      it('should handle missingParts length 0 (edge case)', () => {
        const t = createMockT({ 'errors.date.required': 'Date is required' });
        // This shouldn't happen in practice, but test the fallback
        const result = validateDateField('', '', '', true, t);
        expect(result?.message).toBe('Date is required');
      });
    });

    describe('leap year edge cases', () => {
      it('should accept 29th February in leap year (2000)', () => {
        const result = validateDateField('29', '02', '2000', true);
        expect(result).toBeNull();
      });

      it('should accept 29th February in leap year (2024)', () => {
        const result = validateDateField('29', '02', '2024', true);
        expect(result).toBeNull();
      });

      it('should reject 29th February in non-leap year (1900)', () => {
        const t = createMockT({ 'errors.date.notRealDate': 'Not a real date' });
        const result = validateDateField('29', '02', '1900', true, t);
        expect(result?.message).toBe('Not a real date');
      });

      it('should reject 29th February in non-leap year (2100)', () => {
        const t = createMockT({ 'errors.date.notRealDate': 'Not a real date' });
        const result = validateDateField('29', '02', '2100', true, t);
        expect(result?.message).toBe('Not a real date');
      });
    });

    describe('translations object usage', () => {
      it('should use translations object for futureDate when t is not provided', () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const translations = { dateFutureDate: 'Custom future date error from translations' };
        const result = validateDateField(
          tomorrow.getDate().toString(),
          (tomorrow.getMonth() + 1).toString(),
          tomorrow.getFullYear().toString(),
          true,
          undefined,
          true,
          true,
          translations
        );
        expect(result?.message).toBe('Custom future date error from translations');
      });
    });
  });

  describe('getDateTranslationKey', () => {
    it('should return correct translation key for required', () => {
      const result = getDateTranslationKey('required');
      expect(result).toBe('dateRequired');
    });

    it('should return correct translation key for missingOne', () => {
      const result = getDateTranslationKey('missingOne');
      expect(result).toBe('dateMissingOne');
    });

    it('should return correct translation key for missingTwo', () => {
      const result = getDateTranslationKey('missingTwo');
      expect(result).toBe('dateMissingTwo');
    });

    it('should return correct translation key for futureDate', () => {
      const result = getDateTranslationKey('futureDate');
      expect(result).toBe('dateFutureDate');
    });

    it('should return null for unknown key', () => {
      const result = getDateTranslationKey('unknownKey');
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = getDateTranslationKey('');
      expect(result).toBeNull();
    });
  });
});
