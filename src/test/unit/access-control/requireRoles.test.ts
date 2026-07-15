import type { NextFunction, Request, Response } from 'express';

const mockLogAccessDenied = jest.fn();

jest.mock('../../../main/access-control/logging', () => ({
  logAccessDenied: (...args: unknown[]) => mockLogAccessDenied(...args),
}));

import { HTTPError } from '../../../main/HttpError';
import { requireRoles } from '../../../main/access-control/requireRoles';

interface SessionShape {
  user?: { uid?: string; roles?: string[] };
  returnTo?: string;
  save: jest.Mock;
  destroy: jest.Mock;
}

const buildReq = (
  path: string,
  user?: SessionShape['user'],
  returnTo?: string
): { req: Request; session: SessionShape } => {
  const session: SessionShape = {
    user,
    returnTo,
    save: jest.fn((cb: () => void) => cb()),
    destroy: jest.fn((cb: () => void) => cb()),
  };
  const req = { path, session } as unknown as Request;
  return { req, session };
};

describe('requireRoles', () => {
  let res: Partial<Response>;
  let next: jest.MockedFunction<NextFunction>;
  const guard = requireRoles(['citizen'], 'test-rule');

  beforeEach(() => {
    jest.clearAllMocks();
    res = { redirect: jest.fn() };
    next = jest.fn();
  });

  it('passes through when there is no session user (lets oidc handle login)', () => {
    const { req } = buildReq('/case/1/dashboard');
    guard(req, res as Response, next);
    expect(next).toHaveBeenCalledWith();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('allows the user when their roles include an allowed role', () => {
    const { req } = buildReq('/case/1/dashboard', { uid: 'u1', roles: ['citizen'] });
    guard(req, res as Response, next);
    expect(next).toHaveBeenCalledWith();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('denies a solicitor with HTTPError 403, preserves the session, and does not redirect', () => {
    const { req, session } = buildReq(
      '/case/1/dashboard',
      { uid: 'u1', roles: ['caseworker-pcs-solicitor'] },
      '/case/1/dashboard'
    );
    guard(req, res as Response, next);

    expect(session.user).toEqual({ uid: 'u1', roles: ['caseworker-pcs-solicitor'] });
    expect(session.returnTo).toBe('/case/1/dashboard');
    expect(session.destroy).not.toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();

    const error = next.mock.calls[0][0] as unknown;
    expect(error).toBeInstanceOf(HTTPError);
    expect((error as HTTPError).status).toBe(403);

    expect(mockLogAccessDenied).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'request',
        path: '/case/1/dashboard',
        userId: 'u1',
        rule: expect.objectContaining({ name: 'test-rule' }),
      })
    );
  });

  it('sends any other authenticated role to login by destroying the session, with no 403', () => {
    const { req, session } = buildReq('/case/1/dashboard', { uid: 'u9', roles: ['some-other-role'] });
    guard(req, res as Response, next);

    expect(session.destroy).toHaveBeenCalledTimes(1);
    expect(res.redirect).toHaveBeenCalledWith('/login');
    expect(next).not.toHaveBeenCalled();

    expect(mockLogAccessDenied).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'request', path: '/case/1/dashboard', userId: 'u9' })
    );
  });
});
