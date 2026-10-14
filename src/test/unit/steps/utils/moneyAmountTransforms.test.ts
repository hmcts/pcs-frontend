const mockWarn = jest.fn();

jest.mock('@modules/logger', () => ({
  Logger: {
    getLogger: jest.fn(() => ({
      warn: mockWarn,
      error: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    })),
  },
}));

import { ccdPenceToPoundsString } from '../../../../main/steps/utils/moneyAmountTransforms';

describe('moneyAmountTransforms', () => {
  beforeEach(() => {
    mockWarn.mockClear();
  });

  describe('ccdPenceToPoundsString', () => {
    it('returns undefined for nullish values', () => {
      expect(ccdPenceToPoundsString(undefined)).toBeUndefined();
      expect(ccdPenceToPoundsString(null)).toBeUndefined();
      expect(mockWarn).not.toHaveBeenCalled();
    });

    it('maps digit-only pence strings to pounds with two decimals', () => {
      expect(ccdPenceToPoundsString('14850')).toBe('148.50');
      expect(ccdPenceToPoundsString('2000')).toBe('20.00');
    });

    it('maps numeric pence to pounds with two decimals', () => {
      expect(ccdPenceToPoundsString(14850)).toBe('148.50');
    });

    it('returns undefined for non-pence string shapes and logs a warning', () => {
      expect(ccdPenceToPoundsString('148.50')).toBeUndefined();
      expect(mockWarn).toHaveBeenCalledWith('Unexpected money value [ccdPenceToPoundsString:string]: "148.50"');
      mockWarn.mockClear();
      expect(ccdPenceToPoundsString('')).toBeUndefined();
      expect(mockWarn).not.toHaveBeenCalled();
    });
  });
});
