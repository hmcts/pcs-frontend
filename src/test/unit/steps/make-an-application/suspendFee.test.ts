import {
  SUSPEND_APPLICATION_FEE_FALLBACK,
  getSuspendApplicationFee,
} from '../../../../main/steps/make-an-application/suspendFee';

import { FeeType, getFee } from '@services/feeLookupService';

jest.mock('@modules/logger', () => ({
  Logger: {
    getLogger: jest.fn(() => ({
      warn: jest.fn(),
    })),
  },
}));

jest.mock('@services/feeLookupService', () => ({
  FeeType: {
    genAppSuspendFeeFEE0458: 'genAppSuspendFeeFEE0458',
  },
  getFee: jest.fn(),
}));

describe('suspendFee', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the registered suspend fee', async () => {
    (getFee as jest.Mock).mockResolvedValue(16);

    await expect(getSuspendApplicationFee()).resolves.toBe(16);

    expect(getFee).toHaveBeenCalledWith(FeeType.genAppSuspendFeeFEE0458);
  });

  it('falls back to the FEE0458 amount when fee lookup fails', async () => {
    const error = new Error('Fee lookup failed');
    (getFee as jest.Mock).mockRejectedValue(error);

    await expect(getSuspendApplicationFee()).resolves.toBe(SUSPEND_APPLICATION_FEE_FALLBACK);
  });
});
