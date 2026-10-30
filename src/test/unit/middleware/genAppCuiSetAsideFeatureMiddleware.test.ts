import type { NextFunction, Request, Response } from 'express';

import { genAppCuiSetAsideFeatureMiddleware } from '../../../main/middleware/genAppCuiSetAsideFeatureMiddleware';
import { getLaunchDarklyFlag } from '../../../main/utils/getLaunchDarklyFlag';
import { isGenAppCuiSetAsideEnabled } from '../../../main/utils/isGenAppCuiSetAsideEnabled';

jest.mock('../../../main/utils/getLaunchDarklyFlag');

it.each([true, false])(
  'evaluates genapp-cui-set-aside with a false default and exposes %s to the journey',
  async enabled => {
    jest.mocked(getLaunchDarklyFlag).mockResolvedValue(enabled);
    const res = { locals: {} } as Response;
    const req = { res } as Request;
    const next = jest.fn() as NextFunction;
    await genAppCuiSetAsideFeatureMiddleware(req, res, next);
    expect(getLaunchDarklyFlag).toHaveBeenCalledWith(req, 'genapp-cui-set-aside', false);
    expect(res.locals.features).toEqual({ genAppCuiSetAsideEnabled: enabled });
    expect(isGenAppCuiSetAsideEnabled(req)).toBe(enabled);
    expect(next).toHaveBeenCalledWith();
  }
);

it('preserves flags already loaded by other middleware', async () => {
  jest.mocked(getLaunchDarklyFlag).mockResolvedValue(true);
  const res = { locals: { features: { anotherFeatureEnabled: true } } } as unknown as Response;
  const req = { res } as Request;

  await genAppCuiSetAsideFeatureMiddleware(req, res, jest.fn());

  expect(res.locals.features).toEqual({ anotherFeatureEnabled: true, genAppCuiSetAsideEnabled: true });
});

it.each([{}, { res: { locals: {} } }, { res: { locals: { features: {} } } }])(
  'defaults to disabled when no flag has been loaded: %j',
  req => {
    expect(isGenAppCuiSetAsideEnabled(req as Request)).toBe(false);
  }
);
