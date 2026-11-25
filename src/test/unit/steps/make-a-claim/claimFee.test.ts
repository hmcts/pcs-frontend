import { getClaimIssueFee } from '../../../../main/services/pcsApi/pcsApiService';
import {
  CLAIM_FEE_TTL_MS,
  claimIssueFee,
  clearClaimIssueFeeCache,
  formatFee,
} from '../../../../main/steps/make-a-claim/start/claimFee';

jest.mock('../../../../main/services/pcsApi/pcsApiService', () => ({ getClaimIssueFee: jest.fn() }));
jest.mock('@modules/logger', () => ({
  Logger: { getLogger: () => ({ error: jest.fn(), info: jest.fn(), warn: jest.fn() }) },
}));

const lookUp = getClaimIssueFee as jest.Mock;

describe('formatFee', () => {
  it.each([
    ['404.00', '£404'],
    ['404', '£404'],
    ['404.50', '£404.50'],
    ['1234.00', '£1,234'],
    ['0.05', '£0.05'],
  ])('formats %s as %s', (amount, formatted) => {
    expect(formatFee(amount)).toBe(formatted);
  });
});

describe('claimIssueFee', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    clearClaimIssueFeeCache();
    lookUp.mockReset();
    lookUp.mockResolvedValue({ amount: '404.00', code: 'FEE0412', version: 4 });
  });
  afterEach(() => jest.useRealTimers());

  it('gives the fee the fees register holds', async () => {
    await expect(claimIssueFee()).resolves.toBe('£404');
  });

  it('keeps the fee until the hour is up, then asks again', async () => {
    await claimIssueFee();
    jest.advanceTimersByTime(CLAIM_FEE_TTL_MS - 1);
    await claimIssueFee();
    expect(lookUp).toHaveBeenCalledTimes(1);

    lookUp.mockResolvedValue({ amount: '410.00', code: 'FEE0412', version: 5 });
    jest.advanceTimersByTime(2);
    await expect(claimIssueFee()).resolves.toBe('£410');
    expect(lookUp).toHaveBeenCalledTimes(2);
  });

  it('makes one lookup for visitors who arrive together', async () => {
    await Promise.all([claimIssueFee(), claimIssueFee(), claimIssueFee()]);
    expect(lookUp).toHaveBeenCalledTimes(1);
  });

  it('gives nothing when the lookup fails, and asks again next time', async () => {
    lookUp.mockRejectedValueOnce(new Error('503'));
    await expect(claimIssueFee()).resolves.toBeUndefined();
    await expect(claimIssueFee()).resolves.toBe('£404');
    expect(lookUp).toHaveBeenCalledTimes(2);
  });
});
