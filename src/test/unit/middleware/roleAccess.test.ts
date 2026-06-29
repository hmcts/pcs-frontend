import type { NextFunction, Request, Response } from 'express';

const mockLogAccessDenied = jest.fn();

jest.mock('../../../main/access-control', () => {
  const actual = jest.requireActual('../../../main/access-control');
  return {
    ...actual,
    logAccessDenied: (...args: unknown[]) => mockLogAccessDenied(...args),
  };
});

import { roleAccessMiddleware } from '../../../main/middleware/roleAccess';

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

describe('roleAccessMiddleware', () => {
  let res: Partial<Response>;
  let next: NextFunction;

  const invoke = (req: Request): void => {
    (roleAccessMiddleware as unknown as (req: Request, res: Response, next: NextFunction) => void)(
      req,
      res as Response,
      next
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    res = { redirect: jest.fn() };
    next = jest.fn();
  });

  it('passes through ungated paths without inspecting the session', () => {
    const { req } = buildReq('/claims');
    invoke(req);
    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
    expect(mockLogAccessDenied).not.toHaveBeenCalled();
  });

  it('passes through gated paths when there is no session user (oidcMiddleware handles login)', () => {
    const { req } = buildReq('/case/1/dashboard');
    invoke(req);
    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('allows a citizen into the citizens dashboard', () => {
    const { req } = buildReq('/case/1/dashboard', { uid: 'u1', roles: ['citizen'] });
    invoke(req);
    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('allows a pcs solicitor into respond-to-claim', () => {
    const { req } = buildReq('/case/1/respond-to-claim', { uid: 'u1', roles: ['caseworker-pcs-solicitor'] });
    invoke(req);
    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('blocks a pcs solicitor from the citizens dashboard and clears the session', () => {
    const { req, session } = buildReq('/case/1/dashboard', { uid: 'u1', roles: ['caseworker-pcs-solicitor'] });
    invoke(req);
    expect(session.user).toBeUndefined();
    expect(res.redirect).toHaveBeenCalledWith('/login');
    expect(mockLogAccessDenied).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'request', path: '/case/1/dashboard', userId: 'u1' })
    );
  });

  it('blocks a user with no matching role from make-an-application', () => {
    const { req, session } = buildReq('/case/1/make-an-application', { uid: 'u2', roles: ['some-other-role'] });
    invoke(req);
    expect(session.user).toBeUndefined();
    expect(res.redirect).toHaveBeenCalledWith('/login');
  });

  it('clears stale returnTo on denial to prevent a re-auth bounce loop', () => {
    const { req, session } = buildReq(
      '/case/1/dashboard',
      { uid: 'u1', roles: ['caseworker-pcs-solicitor'] },
      '/case/1/dashboard'
    );
    invoke(req);
    expect(session.returnTo).toBeUndefined();
    expect(session.user).toBeUndefined();
  });

  it('matches deep paths past a gated route', () => {
    const { req, session } = buildReq('/case/1/dashboard/section-a/sub/leaf', {
      uid: 'u3',
      roles: ['caseworker-pcs-solicitor'],
    });
    invoke(req);
    expect(session.user).toBeUndefined();
    expect(res.redirect).toHaveBeenCalledWith('/login');
  });
});
