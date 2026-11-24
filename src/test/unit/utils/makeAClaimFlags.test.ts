import type { Request } from 'express';

import { isMakeAClaimEnabled } from '../../../main/utils/makeAClaimFlags';

jest.mock('config', () => ({ get: jest.fn(() => 'test') }));
jest.mock('@modules/logger', () => ({ Logger: { getLogger: () => ({ info: jest.fn(), error: jest.fn() }) } }));

function requestWith(variation?: jest.Mock): Request {
  return {
    app: { locals: { launchDarklyClient: variation ? { variation } : undefined } },
    session: { user: { uid: 'uid', email: 'pl-1@example.test' } },
    res: { locals: {} },
  } as unknown as Request;
}

describe('isMakeAClaimEnabled', () => {
  it('reads the private landlord flag, off by default', async () => {
    const variation = jest.fn().mockResolvedValue(true);
    await expect(isMakeAClaimEnabled(requestWith(variation))).resolves.toBe(true);
    expect(variation).toHaveBeenCalledWith(
      'private-landlord-make-a-claim-enabled',
      expect.objectContaining({ email: 'pl-1@example.test' }),
      false
    );
  });

  it('asks LaunchDarkly once however many gates check it in a request', async () => {
    const variation = jest.fn().mockResolvedValue(true);
    const req = requestWith(variation);
    await isMakeAClaimEnabled(req);
    await isMakeAClaimEnabled(req);
    expect(variation).toHaveBeenCalledTimes(1);
  });

  it('is off when LaunchDarkly is not there', async () => {
    await expect(isMakeAClaimEnabled(requestWith())).resolves.toBe(false);
  });

  it('is off when LaunchDarkly fails', async () => {
    await expect(isMakeAClaimEnabled(requestWith(jest.fn().mockRejectedValue(new Error('down'))))).resolves.toBe(false);
  });
});
