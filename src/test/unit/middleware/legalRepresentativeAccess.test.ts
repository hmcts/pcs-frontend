import type { NextFunction, Request, Response } from 'express';

const mockIsLegalRepresentativeUser = jest.fn();

jest.mock('../../../main/steps/utils', () => ({
  isLegalRepresentativeUser: (...args: unknown[]) => mockIsLegalRepresentativeUser(...args),
}));

import { legalRepresentativeAccessMiddleware } from '../../../main/middleware/legalRepresentativeAccess';

describe('legalRepresentativeAccessMiddleware', () => {
  let res: Partial<Response>;
  let next: NextFunction;
  const invokeMiddleware = (req: Request): void => {
    (
      legalRepresentativeAccessMiddleware as unknown as (
        request: Request,
        response: Response,
        nextFn: NextFunction
      ) => void
    )(req, res as Response, next);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    next = jest.fn();
  });

  it('allows non-legalrep users through any path', () => {
    mockIsLegalRepresentativeUser.mockReturnValue(false);
    const req = { path: '/dashboard' } as unknown as Request;

    invokeMiddleware(req);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows legalrep users to access respond-to-claim paths', () => {
    mockIsLegalRepresentativeUser.mockReturnValue(true);
    const req = { path: '/case/1234567890123456/respond-to-claim/start-now' } as unknown as Request;

    invokeMiddleware(req);

    expect(next).toHaveBeenCalled();
  });

  it('allows legalrep users to access postcode lookup api', () => {
    mockIsLegalRepresentativeUser.mockReturnValue(true);
    const req = { path: '/api/postcode-lookup' } as unknown as Request;

    invokeMiddleware(req);

    expect(next).toHaveBeenCalled();
  });

  it('blocks legalrep users from non-allowed paths', () => {
    mockIsLegalRepresentativeUser.mockReturnValue(true);
    const req = { path: '/dashboard' } as unknown as Request;

    invokeMiddleware(req);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith('Not Found');
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks legalrep users from access-code paths', () => {
    mockIsLegalRepresentativeUser.mockReturnValue(true);
    const req = { path: '/case/1234567890123456/access-code' } as unknown as Request;

    invokeMiddleware(req);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith('Not Found');
    expect(next).not.toHaveBeenCalled();
  });
});
