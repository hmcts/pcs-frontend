import type { NextFunction, Request, Response } from 'express';

const mockLogAccessDenied = jest.fn();

jest.mock('../../../main/access-control', () => {
  const actual = jest.requireActual('../../../main/access-control');
  return {
    ...actual,
    logAccessDenied: (...args: unknown[]) => mockLogAccessDenied(...args),
  };
});

import { HTTPError } from '../../../main/HttpError';
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
  let next: jest.MockedFunction<NextFunction>;

  const invoke = (req: Request): void => {
    (roleAccessMiddleware as unknown as (req: Request, res: Response, next: NextFunction) => void)(
      req,
      res as Response,
      next
    );
  };

  const lastError = (): unknown => next.mock.calls[0]?.[0] as unknown;

  beforeEach(() => {
    jest.clearAllMocks();
    res = { redirect: jest.fn() };
    next = jest.fn();
  });

  it('passes through ungated paths without inspecting the session', () => {
    const { req } = buildReq('/some/random/page');
    invoke(req);
    expect(next).toHaveBeenCalledWith();
    expect(res.redirect).not.toHaveBeenCalled();
    expect(mockLogAccessDenied).not.toHaveBeenCalled();
  });

  it('passes through gated paths when there is no session user (oidcMiddleware handles login)', () => {
    const { req } = buildReq('/case/1/dashboard');
    invoke(req);
    expect(next).toHaveBeenCalledWith();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('allows a citizen into the citizens dashboard', () => {
    const { req } = buildReq('/case/1/dashboard', { uid: 'u1', roles: ['citizen'] });
    invoke(req);
    expect(next).toHaveBeenCalledWith();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('allows a pcs solicitor into respond-to-claim', () => {
    const { req } = buildReq('/case/1/respond-to-claim', { uid: 'u1', roles: ['caseworker-pcs-solicitor'] });
    invoke(req);
    expect(next).toHaveBeenCalledWith();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('denies a pcs solicitor on the citizens dashboard with HTTPError 403 and preserves the session', () => {
    const { req, session } = buildReq(
      '/case/1/dashboard',
      { uid: 'u1', roles: ['caseworker-pcs-solicitor'] },
      '/case/1/dashboard'
    );
    invoke(req);

    expect(session.user).toEqual({ uid: 'u1', roles: ['caseworker-pcs-solicitor'] });
    expect(session.returnTo).toBe('/case/1/dashboard');
    expect(res.redirect).not.toHaveBeenCalled();

    const error = lastError();
    expect(error).toBeInstanceOf(HTTPError);
    expect((error as HTTPError).status).toBe(403);

    expect(mockLogAccessDenied).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'request', path: '/case/1/dashboard', userId: 'u1' })
    );
  });

  it('denies a user with no matching role from make-an-application', () => {
    const { req } = buildReq('/case/1/make-an-application', { uid: 'u2', roles: ['some-other-role'] });
    invoke(req);
    expect((lastError() as HTTPError).status).toBe(403);
  });

  it('denies an authenticated solicitor on /claims (citizen-only)', () => {
    const { req, session } = buildReq('/claims', { uid: 'u3', roles: ['caseworker-pcs-solicitor'] });
    invoke(req);
    expect(session.user).toBeDefined();
    expect((lastError() as HTTPError).status).toBe(403);
  });

  it('denies an authenticated solicitor on /access-your-case (citizen-only)', () => {
    const { req } = buildReq('/access-your-case', { uid: 'u4', roles: ['caseworker-pcs-solicitor'] });
    invoke(req);
    expect((lastError() as HTTPError).status).toBe(403);
  });

  it('matches deep paths past a gated route', () => {
    const { req } = buildReq('/case/1/dashboard/section-a/sub/leaf', {
      uid: 'u5',
      roles: ['caseworker-pcs-solicitor'],
    });
    invoke(req);
    expect((lastError() as HTTPError).status).toBe(403);
  });
});
