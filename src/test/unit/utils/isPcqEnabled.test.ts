import type { Request } from 'express';

import { getLaunchDarklyFlag } from '../../../main/utils/getLaunchDarklyFlag';
import { isPcqEnabled } from '../../../main/utils/isPcqEnabled';

jest.mock('../../../main/utils/getLaunchDarklyFlag', () => ({
  getLaunchDarklyFlag: jest.fn(),
}));

describe('isPcqEnabled', () => {
  const req = {} as Request;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads the release-1.3 flag and defaults to off', async () => {
    (getLaunchDarklyFlag as jest.Mock).mockResolvedValue(true);

    await expect(isPcqEnabled(req)).resolves.toBe(true);

    // Release-level flag, not a PCQ-specific one — PCQ ships with the rest of 1.3.
    // Defaulting to false keeps the citizen on the normal journey if LaunchDarkly is unreachable.
    expect(getLaunchDarklyFlag).toHaveBeenCalledWith(req, 'release-1.3-enabled', false);
  });

  it('returns false when the flag is off', async () => {
    (getLaunchDarklyFlag as jest.Mock).mockResolvedValue(false);

    await expect(isPcqEnabled(req)).resolves.toBe(false);
  });
});
