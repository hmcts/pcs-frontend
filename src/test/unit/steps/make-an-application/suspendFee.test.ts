import { getSuspendApplicationFee } from '../../../../main/steps/make-an-application/suspendFee';

import { FeeType, getFee } from '@services/feeLookupService';

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
});
