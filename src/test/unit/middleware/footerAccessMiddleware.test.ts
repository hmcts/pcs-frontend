import type { NextFunction, Request, Response } from 'express';

import { footerAccessMiddleware } from '../../../main/middleware/footerAccessMiddleware';

import { getLaunchDarklyFlag } from '@utils/getLaunchDarklyFlag';
import { RELEASE_1_3_ENABLED } from '@utils/respondToClaimFlags';

jest.mock('@utils/getLaunchDarklyFlag', () => ({
  getLaunchDarklyFlag: jest.fn(),
}));

const mockGetLaunchDarklyFlag = getLaunchDarklyFlag as jest.MockedFunction<typeof getLaunchDarklyFlag>;

describe('footerAccessMiddleware', () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {} as Request;
    res = { locals: {} } as Response;
    next = jest.fn();
  });

  it.each([true, false])('exposes release 1.3 as %s to rendered views', async enabled => {
    mockGetLaunchDarklyFlag.mockResolvedValue(enabled);

    await footerAccessMiddleware(req, res, next);

    expect(mockGetLaunchDarklyFlag).toHaveBeenCalledWith(req, RELEASE_1_3_ENABLED, false);
    expect(res.locals.release1dot3Enabled).toBe(enabled);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
