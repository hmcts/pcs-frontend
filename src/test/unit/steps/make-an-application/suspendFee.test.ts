import { FeeType, getFee } from '@services/feeLookupService';

const mockWarn = jest.fn();

jest.mock('@modules/logger', () => ({
  Logger: {
    getLogger: jest.fn(() => ({
      warn: mockWarn,
    })),
  },
}));

jest.mock('@services/feeLookupService', () => ({
  FeeType: {
    genAppSuspendFeeFEE0458: 'genAppSuspendFeeFEE0458',
  },
  getFee: jest.fn(),
}));

import {
  getSuspendApplicationFee,
  SUSPEND_APPLICATION_FEE_FALLBACK,
} from '../../../../main/steps/make-an-application/suspendFee';

describe('suspendFee', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the registered suspend fee', async () => {
    (getFee as jest.Mock).mockResolvedValue(16);

    await expect(getSuspendApplicationFee()).resolves.toBe(16);

    expect(getFee).toHaveBeenCalledWith(FeeType.genAppSuspendFeeFEE0458);
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it('falls back to the FEE0458 amount when fee lookup fails', async () => {
    const error = new Error('Fee lookup failed');
    (getFee as jest.Mock).mockRejectedValue(error);

    await expect(getSuspendApplicationFee()).resolves.toBe(SUSPEND_APPLICATION_FEE_FALLBACK);

    expect(mockWarn).toHaveBeenCalledWith('Using fallback suspend application fee because fee lookup failed', {
      err: error,
      fallbackFee: SUSPEND_APPLICATION_FEE_FALLBACK,
    });
  });
});
