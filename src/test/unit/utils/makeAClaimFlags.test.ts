import type { Request } from 'express';

import { getRentHistoryDesign, isMakeAClaimEnabled, toRentHistoryDesign } from '../../../main/utils/makeAClaimFlags';

jest.mock('config', () => ({ get: jest.fn(() => 'test') }));
jest.mock('@modules/logger', () => ({ Logger: { getLogger: () => ({ info: jest.fn(), error: jest.fn() }) } }));

function requestWith(variation?: jest.Mock): Request {
  return {
    app: { locals: { launchDarklyClient: variation ? { variation } : undefined } },
    session: { user: { uid: 'uid', email: 'pl-table-1@example.test' } },
  } as unknown as Request;
}

describe('isMakeAClaimEnabled', () => {
  it('reads the private landlord flag, off by default', async () => {
    const variation = jest.fn().mockResolvedValue(true);
    await expect(isMakeAClaimEnabled(requestWith(variation))).resolves.toBe(true);
    expect(variation).toHaveBeenCalledWith(
      'private-landlord-make-a-claim-enabled',
      expect.objectContaining({ email: 'pl-table-1@example.test' }),
      false
    );
  });

  it('is off when LaunchDarkly is not there', async () => {
    await expect(isMakeAClaimEnabled(requestWith())).resolves.toBe(false);
  });

  it('is off when LaunchDarkly fails', async () => {
    await expect(isMakeAClaimEnabled(requestWith(jest.fn().mockRejectedValue(new Error('down'))))).resolves.toBe(false);
  });
});

describe('rent history design', () => {
  it.each([
    ['table', 'table'],
    ['ledger', 'ledger'],
    ['TABLE', 'ledger'],
    ['spreadsheet', 'ledger'],
    [undefined, 'ledger'],
    [true, 'ledger'],
  ])('reads %p as %p', (value, design) => {
    expect(toRentHistoryDesign(value)).toBe(design);
  });

  it('asks LaunchDarkly with the ledger as its default', async () => {
    const variation = jest.fn().mockResolvedValue('table');
    await expect(getRentHistoryDesign(requestWith(variation))).resolves.toBe('table');
    expect(variation).toHaveBeenCalledWith('private-landlord-rent-history-design', expect.anything(), 'ledger');
  });

  it('is the ledger without LaunchDarkly', async () => {
    await expect(getRentHistoryDesign(requestWith())).resolves.toBe('ledger');
  });
});
