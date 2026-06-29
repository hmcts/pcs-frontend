import type { NextFunction, Request, Response } from 'express';

const mockLogAccessDenied = jest.fn();

jest.mock('../../../main/access-control/logging', () => ({
  logAccessDenied: (...args: unknown[]) => mockLogAccessDenied(...args),
}));

import { requireRoles } from '../../../main/access-control/requireRoles';

interface SessionShape {
  user?: { uid?: string; roles?: string[] };
  returnTo?: string;
  save: jest.Mock;
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
  };
  const req = { path, session } as unknown as Request;
  return { req, session };
};

describe('requireRoles', () => {
  let res: Partial<Response>;
  let next: NextFunction;
  const guard = requireRoles(['citizen'], 'test-rule');

  beforeEach(() => {
    jest.clearAllMocks();
    res = { redirect: jest.fn() };
    next = jest.fn();
  });

  it('passes through when there is no session user (lets oidc handle login)', () => {
    const { req } = buildReq('/case/1/dashboard');
    guard(req, res as Response, next);
    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('allows the user when their roles include an allowed role', () => {
    const { req } = buildReq('/case/1/dashboard', { uid: 'u1', roles: ['citizen'] });
    guard(req, res as Response, next);
    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('blocks the user, clears session+returnTo, and redirects to /login on denial', () => {
    const { req, session } = buildReq('/case/1/dashboard', { uid: 'u1', roles: ['other'] }, '/case/1/dashboard');
    guard(req, res as Response, next);
    expect(session.user).toBeUndefined();
    expect(session.returnTo).toBeUndefined();
    expect(res.redirect).toHaveBeenCalledWith('/login');
    expect(mockLogAccessDenied).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'request',
        path: '/case/1/dashboard',
        userId: 'u1',
        rule: expect.objectContaining({ name: 'test-rule' }),
      })
    );
  });
});
