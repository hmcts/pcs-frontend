import type { Request } from 'express';

import { getLaunchDarklyFlag } from '../../../main/utils/getLaunchDarklyFlag';
import { isCuiWelshEnabled } from '../../../main/utils/isCuiWelshEnabled';

jest.mock('../../../main/utils/getLaunchDarklyFlag', () => ({
  getLaunchDarklyFlag: jest.fn(),
}));

describe('isCuiWelshEnabled', () => {
  const req = {} as Request;

  it('reads cui-welsh-enabled, defaulting to off', async () => {
    (getLaunchDarklyFlag as jest.Mock).mockResolvedValue(true);

    await expect(isCuiWelshEnabled(req)).resolves.toBe(true);
    expect(getLaunchDarklyFlag).toHaveBeenCalledWith(req, 'cui-welsh-enabled', false);
  });
});
