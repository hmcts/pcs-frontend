import { fromVerticalYesNoEnum, toVerticalYesNoEnum } from '../../../../main/steps/utils/yesNoEnum';

describe('yesNoEnum utilities', () => {
  describe('toYesNoEnum', () => {
    it('should convert "yes" to "YES"', () => {
      const result = toVerticalYesNoEnum('yes');
      expect(result).toBe('YES');
    });

    it('should convert "no" to "NO"', () => {
      const result = toVerticalYesNoEnum('no');
      expect(result).toBe('NO');
    });
  });

  describe('fromYesNoEnum', () => {
    it('should convert "YES" to "yes"', () => {
      const result = fromVerticalYesNoEnum('YES');
      expect(result).toBe('yes');
    });

    it('should convert "NO" to "no"', () => {
      const result = fromVerticalYesNoEnum('NO');
      expect(result).toBe('no');
    });

    it('should return undefined for null', () => {
      const result = fromVerticalYesNoEnum(null);
      expect(result).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      const result = fromVerticalYesNoEnum(undefined);
      expect(result).toBeUndefined();
    });

    it('should return undefined for invalid string', () => {
      const result = fromVerticalYesNoEnum('INVALID');
      expect(result).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const result = fromVerticalYesNoEnum('');
      expect(result).toBeUndefined();
    });
  });
});
