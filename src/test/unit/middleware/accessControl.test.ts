import type { NextFunction, Request, Response } from 'express';

const mockOidcMiddleware = jest.fn();
const mockGetUserType = jest.fn();

jest.mock('../../../main/middleware/oidc', () => ({
  oidcMiddleware: (...args: unknown[]) => mockOidcMiddleware(...args),
}));

jest.mock('../../../main/steps/utils', () => ({
  getUserType: (...args: unknown[]) => mockGetUserType(...args),
  getUserRoles: () => [],
}));

jest.mock('../../../main/steps/respond-to-claim/legalrep.flow.config', () => ({
  legalrepFlowConfig: {
    stepOrder: ['start-now', 'select-defendant', 'upload-document', 'end-of-journey-cya', 'end-now'],
  },
}));

import {
  authenticationGate,
  authorisationGate,
  isPublicPath,
  isSolicitorAllowedPath,
} from '../../../main/middleware/accessControl';

describe('accessControl', () => {
  let res: Partial<Response>;
  let next: NextFunction;

  const run = (handler: unknown, req: Request): void =>
    (handler as (request: Request, response: Response, nextFn: NextFunction) => void)(req, res as Response, next);

  beforeEach(() => {
    jest.clearAllMocks();
    res = { redirect: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };
    next = jest.fn();
  });

  describe('isPublicPath', () => {
    it.each(['/', '/login', '/oauth2/callback', '/logout', '/active', '/health/readiness', '/info'])(
      'treats %s as public',
      path => expect(isPublicPath(path)).toBe(true)
    );

    it.each([
      '/claims',
      '/case/1234567890123456/dashboard',
      '/api/postcode-lookup',
      '/main-dev.js',
      '/assets/x.png',
      '/login/foo',
      '/logout/somewhere',
      '/oauth2/callback/extra',
    ])('treats %s as protected', path => expect(isPublicPath(path)).toBe(false));
  });

  describe('isSolicitorAllowedPath', () => {
    const ref = '/case/1234567890123456';

    it.each([
      `${ref}/respond-to-claim`,
      `${ref}/respond-to-claim/start-now`,
      `${ref}/respond-to-claim/select-defendant`,
      `${ref}/respond-to-claim/upload-document`,
      '/api/postcode-lookup',
      `${ref}/respond-to-claim/upload-document/upload`,
      `${ref}/respond-to-claim/upload-document/delete`,
      `${ref}/respond-to-claim/upload-document/document/0`,
      `${ref}/final-submit`,
    ])('allows %s', path => expect(isSolicitorAllowedPath(path)).toBe(true));

    it.each([
      `${ref}/respond-to-claim/task-list`,
      `${ref}/respond-to-claim/check-your-answers-your-response`,
      `${ref}/respond-to-claim/counter-claim-payment/start`,
      `${ref}/respond-to-claim/reasonable-adjustments-triage`,
      `${ref}/view-documents`,
      `${ref}/dashboard`,
      '/claims',
    ])('denies %s', path => expect(isSolicitorAllowedPath(path)).toBe(false));
  });

  describe('authenticationGate', () => {
    it('skips authentication for public paths', () => {
      run(authenticationGate, { path: '/login' } as Request);

      expect(next).toHaveBeenCalled();
      expect(mockOidcMiddleware).not.toHaveBeenCalled();
    });

    it('runs oidc authentication for protected paths', () => {
      const req = { path: '/claims' } as Request;
      run(authenticationGate, req);

      expect(mockOidcMiddleware).toHaveBeenCalledWith(req, res, next);
    });
  });

  describe('authorisationGate', () => {
    it('skips authorisation for public paths', () => {
      run(authorisationGate, { path: '/health' } as Request);

      expect(next).toHaveBeenCalledWith();
      expect(mockGetUserType).not.toHaveBeenCalled();
    });

    it('allows a citizen to reach any protected path', () => {
      mockGetUserType.mockReturnValue('citizen');
      run(authorisationGate, { path: '/case/1234567890123456/dashboard' } as Request);

      expect(next).toHaveBeenCalledWith();
    });

    it('allows a legal representative onto an allowed path', () => {
      mockGetUserType.mockReturnValue('legalrep');
      run(authorisationGate, { path: '/case/1234567890123456/respond-to-claim/start-now' } as Request);

      expect(next).toHaveBeenCalledWith();
    });

    it('returns 403 for a legal representative on a disallowed path', () => {
      mockGetUserType.mockReturnValue('legalrep');
      run(authorisationGate, { path: '/claims' } as Request);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
    });

    it('logs out a session whose role is not permitted', () => {
      mockGetUserType.mockReturnValue('unauthorised');
      run(authorisationGate, { path: '/claims' } as Request);

      expect(res.redirect).toHaveBeenCalledWith('/logout');
      expect(next).not.toHaveBeenCalled();
    });
  });
});
