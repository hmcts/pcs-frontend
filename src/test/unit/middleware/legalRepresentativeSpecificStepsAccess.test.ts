import type { NextFunction, Request, Response } from 'express';

const mockIsLegalRepresentativeUser = jest.fn();

jest.mock('../../../main/steps/utils', () => ({
  isLegalRepresentativeUser: (...args: unknown[]) => mockIsLegalRepresentativeUser(...args),
}));

jest.mock('../../../main/middleware/handleRespondToClaimDisabled', () => ({
  handleRespondToClaimDisabled: jest.fn(),
}));

import { handleRespondToClaimDisabled } from '../../../main/middleware';
import { legalRepresentativeSpecificStepsAccessMiddleware } from '../../../main/middleware/legalRepresentativeSpecificStepsAccess';

const mockHandleRespondToClaimDisabled = handleRespondToClaimDisabled as jest.MockedFunction<
  typeof handleRespondToClaimDisabled
>;

describe('legalRepresentativeSpecificStepsAccessMiddleware', () => {
  let res: Partial<Response>;
  let next: NextFunction;
  const invokeMiddleware = (req: Request): void => {
    (
      legalRepresentativeSpecificStepsAccessMiddleware as unknown as (
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

  it('allows legalrep users through any path', () => {
    mockIsLegalRepresentativeUser.mockReturnValue(true);
    const req = { path: '/dashboard' } as unknown as Request;

    invokeMiddleware(req);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows non legalrep users to access generic respond-to-claim paths', () => {
    mockIsLegalRepresentativeUser.mockReturnValue(false);
    const req = { path: '/case/1234567890123456/respond-to-claim/start-now' } as unknown as Request;

    invokeMiddleware(req);

    expect(next).toHaveBeenCalled();
  });

  it('blocks non legalrep users from select-defendant path', () => {
    mockIsLegalRepresentativeUser.mockReturnValue(false);
    const req = { path: '/case/1234567890123456/respond-to-claim/select-defendant' } as unknown as Request;

    invokeMiddleware(req);

    expect(mockHandleRespondToClaimDisabled).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
