import type { Request } from 'express';

import { getLaunchDarklyFlag } from '../../../main/utils/getLaunchDarklyFlag';
import { isWelshLanguageUsedEnabled } from '../../../main/utils/isWelshLanguageUsedEnabled';
import { isWelshToggleEnabled } from '../../../main/utils/isWelshToggleEnabled';

jest.mock('../../../main/utils/getLaunchDarklyFlag', () => ({
  getLaunchDarklyFlag: jest.fn(),
}));

describe('Welsh flags', () => {
  const req = {} as Request;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['isWelshToggleEnabled', isWelshToggleEnabled, 'cui-welsh-toggle-enabled'],
    ['isWelshLanguageUsedEnabled', isWelshLanguageUsedEnabled, 'welsh-language-used-enabled'],
  ])('%s reads %s, defaulting to off', async (_name, check, flagKey) => {
    (getLaunchDarklyFlag as jest.Mock).mockResolvedValue(true);

    await expect(check(req)).resolves.toBe(true);
    expect(getLaunchDarklyFlag).toHaveBeenCalledWith(req, flagKey, false);
  });
});
