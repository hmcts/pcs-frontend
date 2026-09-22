import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { step as taskListStep } from '../../../../main/steps/respond-to-claim/task-list';

jest.mock('@steps', () => ({
  getUserVariant: jest.fn(),
  getFlowConfigForJourney: () => undefined,
}));

import { getUserVariant } from '@steps';

const mkRes = (): Response => {
  const res = {} as Response;
  res.redirect = jest.fn() as unknown as Response['redirect'];
  return res;
};

const reqWith = (caseId = '1234123412341234'): Request =>
  ({ res: { locals: { validatedCase: { id: caseId } } } }) as unknown as Request;

const middleware = (): RequestHandler => {
  const list = taskListStep.middleware;
  if (!list || list.length === 0) {
    throw new Error('Expected task-list step to declare middleware');
  }
  return list[0];
};

describe('task-list — legalrep guard middleware', () => {
  afterEach(() => jest.resetAllMocks());

  it('redirects legal reps to the case-detail page on the dashboard', () => {
    (getUserVariant as jest.Mock).mockReturnValue('legalrep');
    const res = mkRes();
    const next = jest.fn() as NextFunction;

    middleware()(reqWith(), res, next);

    expect(res.redirect).toHaveBeenCalledTimes(1);
    const [status, url] = (res.redirect as unknown as jest.Mock).mock.calls[0];
    expect(status).toBe(303);
    expect(url).toContain('1234123412341234');
    expect(next).not.toHaveBeenCalled();
  });

  it('passes through to next() for citizen variants', () => {
    (getUserVariant as jest.Mock).mockReturnValue('default');
    const res = mkRes();
    const next = jest.fn() as NextFunction;

    middleware()(reqWith(), res, next);

    expect(res.redirect).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
