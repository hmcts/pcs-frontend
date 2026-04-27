import { penceToPounds, poundsToPence } from '../../../../main/steps/utils/currencyConversion';

describe('currencyConversion', () => {
  describe('penceToPounds', () => {
    it('should convert pence string to pounds with 2 decimal places', () => {
      expect(penceToPounds('14850')).toBe('148.50');
      expect(penceToPounds('100')).toBe('1.00');
      expect(penceToPounds('50')).toBe('0.50');
      expect(penceToPounds('5')).toBe('0.05');
      expect(penceToPounds('0')).toBe('0.00');
    });

    it('should convert pence number to pounds with 2 decimal places', () => {
      expect(penceToPounds(14850)).toBe('148.50');
      expect(penceToPounds(100)).toBe('1.00');
      expect(penceToPounds(50)).toBe('0.50');
      expect(penceToPounds(5)).toBe('0.05');
      expect(penceToPounds(0)).toBe('0.00');
    });

    it('should handle large amounts', () => {
      expect(penceToPounds('100000000')).toBe('1000000.00'); // £1 million
      expect(penceToPounds(100000000)).toBe('1000000.00');
    });

    it('should return undefined for null', () => {
      expect(penceToPounds(null as unknown as string)).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      expect(penceToPounds(undefined)).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(penceToPounds('')).toBeUndefined();
    });

    it('should return undefined for invalid string', () => {
      expect(penceToPounds('invalid')).toBeUndefined();
      expect(penceToPounds('abc123')).toBeUndefined();
      expect(penceToPounds('£100')).toBeUndefined();
    });

    it('should handle negative values', () => {
      expect(penceToPounds('-14850')).toBe('-148.50');
      expect(penceToPounds(-14850)).toBe('-148.50');
    });

    it('should handle decimal pence values', () => {
      expect(penceToPounds('14850.50')).toBe('148.50'); // 148.505 with toFixed(2)
      expect(penceToPounds(14850.5)).toBe('148.50');
    });
  });

  describe('poundsToPence', () => {
    it('should convert pounds string to pence', () => {
      expect(poundsToPence('148.50')).toBe('14850');
      expect(poundsToPence('1.00')).toBe('100');
      expect(poundsToPence('0.50')).toBe('50');
      expect(poundsToPence('0.05')).toBe('5');
      expect(poundsToPence('0.00')).toBe('0');
    });

    it('should handle comma-separated values', () => {
      expect(poundsToPence('1,234.56')).toBe('123456');
      expect(poundsToPence('10,000.00')).toBe('1000000');
      expect(poundsToPence('1,000,000.00')).toBe('100000000');
    });

    it('should round to nearest pence (avoids floating point issues)', () => {
      expect(poundsToPence('148.505')).toBe('14851'); // Rounds up
      expect(poundsToPence('148.504')).toBe('14850'); // Rounds down
      expect(poundsToPence('0.555')).toBe('56'); // Rounds up
    });

    it('should handle whole numbers (no decimal)', () => {
      expect(poundsToPence('148')).toBe('14800');
      expect(poundsToPence('1')).toBe('100');
      expect(poundsToPence('0')).toBe('0');
    });

    it('should handle single decimal place', () => {
      expect(poundsToPence('148.5')).toBe('14850');
      expect(poundsToPence('1.5')).toBe('150');
    });

    it('should return undefined for undefined', () => {
      expect(poundsToPence(undefined)).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(poundsToPence('')).toBeUndefined();
    });

    it('should return undefined for invalid string', () => {
      expect(poundsToPence('invalid')).toBeUndefined();
      expect(poundsToPence('abc123')).toBeUndefined();
      expect(poundsToPence('£100')).toBeUndefined();
    });

    it('should handle negative values', () => {
      expect(poundsToPence('-148.50')).toBe('-14850');
      expect(poundsToPence('-1.00')).toBe('-100');
    });

    it('should handle whitespace by normalizing', () => {
      expect(poundsToPence(' 148.50 ')).toBe('14850');
      expect(poundsToPence('  1.00  ')).toBe('100');
    });
  });

  describe('penceToPounds and poundsToPence round-trip', () => {
    it('should maintain value integrity in round-trip conversion', () => {
      const testValues = ['14850', '100', '50', '0', '123456'];

      testValues.forEach(pence => {
        const pounds = penceToPounds(pence);
        const backToPence = poundsToPence(pounds as string);
        expect(backToPence).toBe(pence);
      });
    });

    it('should handle round-trip with comma-formatted input', () => {
      const poundsWithCommas = '1,234.56';
      const pence = poundsToPence(poundsWithCommas);
      const backToPounds = penceToPounds(pence as string);
      expect(backToPounds).toBe('1234.56'); // Commas removed but value preserved
    });
  });
});
