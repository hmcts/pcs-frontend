import type { NextFunction, Request, Response } from 'express';

import { featureFlagMiddleware } from '../../../main/middleware/featureFlagMiddleware';

const mockGetLaunchDarklyFlag = jest.fn();
jest.mock('@utils/getLaunchDarklyFlag', () => ({
  getLaunchDarklyFlag: (...args: unknown[]) => mockGetLaunchDarklyFlag(...args),
}));

describe('featureFlagMiddleware', () => {
  let res: Partial<Response>;
  let next: NextFunction;
  const invokeMiddleware = async (req: Request): Promise<void> => {
    await featureFlagMiddleware(req, res as Response, next);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    res = {
      locals: {},
    };
    next = jest.fn();
  });

  it.each([true, false])('sets %s release1b feature flag on res.locals', async release1bEnabled => {
    const req = {} as unknown as Request;
    mockGetLaunchDarklyFlag.mockResolvedValue(release1bEnabled);

    await invokeMiddleware(req);

    expect(next).toHaveBeenCalled();
    expect(res.locals?.featureFlags).toEqual({
      release1bEnabled,
    });
  });
});
