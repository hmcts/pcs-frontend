import { ccdPenceToPoundsString, poundsStringToPence } from '../../../../main/steps/utils/moneyAmountTransforms';

describe('moneyAmountTransforms', () => {
  describe('poundsStringToPence', () => {
    it('converts pounds string to integer pence', () => {
      expect(poundsStringToPence('148.50')).toBe(14850);
      expect(poundsStringToPence(' 20 ')).toBe(2000);
    });
  });

  describe('ccdPenceToPoundsString', () => {
    it('returns undefined for nullish values', () => {
      expect(ccdPenceToPoundsString(undefined)).toBeUndefined();
      expect(ccdPenceToPoundsString(null)).toBeUndefined();
    });

    it('maps digit-only pence strings to pounds with two decimals', () => {
      expect(ccdPenceToPoundsString('14850')).toBe('148.50');
      expect(ccdPenceToPoundsString('2000')).toBe('20.00');
    });

    it('maps numeric pence to pounds with two decimals', () => {
      expect(ccdPenceToPoundsString(14850)).toBe('148.50');
    });

    it('returns undefined for non-pence string shapes', () => {
      expect(ccdPenceToPoundsString('148.50')).toBeUndefined();
      expect(ccdPenceToPoundsString('')).toBeUndefined();
    });
  });
});
