import type { NextFunction, Request, Response } from 'express';

import { release1BFeatureMiddleware } from '../../../main/middleware/release1BFeatureMiddleware';
import { getLaunchDarklyFlag } from '../../../main/utils/getLaunchDarklyFlag';
import { isRelease1BEnabled } from '../../../main/utils/isRelease1BEnabled';

jest.mock('../../../main/utils/getLaunchDarklyFlag');

it.each([true, false])('evaluates release 1B with a false default and exposes %s to the journey', async enabled => {
  jest.mocked(getLaunchDarklyFlag).mockResolvedValue(enabled);
  const res = { locals: {} } as Response;
  const req = { res } as Request;
  const next = jest.fn() as NextFunction;
  await release1BFeatureMiddleware(req, res, next);
  expect(getLaunchDarklyFlag).toHaveBeenCalledWith(req, 'release-1b-enabled', false);
  expect(res.locals.features).toEqual({ release1bEnabled: enabled });
  expect(isRelease1BEnabled(req)).toBe(enabled);
  expect(next).toHaveBeenCalledWith();
});

it('preserves flags already loaded by other middleware', async () => {
  jest.mocked(getLaunchDarklyFlag).mockResolvedValue(true);
  const res = { locals: { features: { anotherFeatureEnabled: true } } } as unknown as Response;
  const req = { res } as Request;

  await release1BFeatureMiddleware(req, res, jest.fn());

  expect(res.locals.features).toEqual({ anotherFeatureEnabled: true, release1bEnabled: true });
});

it.each([{}, { res: { locals: {} } }, { res: { locals: { features: {} } } }])(
  'defaults to disabled when no flag has been loaded: %j',
  req => {
    expect(isRelease1BEnabled(req as Request)).toBe(false);
  }
);
