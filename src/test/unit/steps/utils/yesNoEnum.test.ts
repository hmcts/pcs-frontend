import { fromYesNoEnum, toYesNoEnum } from '../../../../main/steps/utils/yesNoEnum';

describe('yesNoEnum utilities', () => {
  describe('toYesNoEnum', () => {
    it('should convert "yes" to "YES"', () => {
      const result = toYesNoEnum('yes');
      expect(result).toBe('YES');
    });

    it('should convert "no" to "NO"', () => {
      const result = toYesNoEnum('no');
      expect(result).toBe('NO');
    });
  });

  describe('fromYesNoEnum', () => {
    it('should convert "Yes" to "yes"', () => {
      const result = fromYesNoEnum('Yes');
      expect(result).toBe('yes');
    });

    it('should convert "No" to "no"', () => {
      const result = fromYesNoEnum('No');
      expect(result).toBe('no');
    });

    it('should handle uppercase "YES" case-insensitively', () => {
      const result = fromYesNoEnum('YES');
      expect(result).toBe('yes');
    });

    it('should handle uppercase "NO" case-insensitively', () => {
      const result = fromYesNoEnum('NO');
      expect(result).toBe('no');
    });

    it('should return undefined for undefined', () => {
      const result = fromYesNoEnum(undefined);
      expect(result).toBeUndefined();
    });

    it('should return undefined for invalid string', () => {
      const result = fromYesNoEnum('INVALID');
      expect(result).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const result = fromYesNoEnum('');
      expect(result).toBeUndefined();
    });
  });
});
