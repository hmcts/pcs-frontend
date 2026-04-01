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
    it('should convert "YES" to "yes"', () => {
      const result = fromYesNoEnum('YES');
      expect(result).toBe('yes');
    });

    it('should convert "NO" to "no"', () => {
      const result = fromYesNoEnum('NO');
      expect(result).toBe('no');
    });

    it('should return undefined for null', () => {
      const result = fromYesNoEnum(null);
      expect(result).toBeUndefined();
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
