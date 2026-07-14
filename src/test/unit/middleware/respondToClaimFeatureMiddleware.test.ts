import type { NextFunction, Request, Response } from 'express';

jest.mock('@utils/isRespondToClaimEnabledForUser', () => ({
  isRespondToClaimEnabledForUser: jest.fn(),
  isRespondToClaimEnabledForRelease: jest.fn(),
}));

jest.mock('../../../main/steps/utils/userRole', () => ({
  getUserType: jest.fn(),
  isLegalRepresentativeUser: jest.fn(),
}));

jest.mock('../../../main/middleware/handleRespondToClaimDisabled', () => ({
  handleRespondToClaimDisabled: jest.fn(),
}));

import { handleRespondToClaimDisabled, respondToClaimFeatureMiddleware } from '../../../main/middleware';
import { isLegalRepresentativeUser } from '../../../main/steps/utils';

import {
  isRespondToClaimEnabledForRelease,
  isRespondToClaimEnabledForUser,
} from '@utils/isRespondToClaimEnabledForUser';

const mockIsRespondToClaimEnabledForUser = isRespondToClaimEnabledForUser as jest.MockedFunction<
  typeof isRespondToClaimEnabledForUser
>;
const mockIsRespondToClaimEnabledForRelease = isRespondToClaimEnabledForRelease as jest.MockedFunction<
  typeof isRespondToClaimEnabledForRelease
>;

const mockHandleRespondToClaimDisabled = handleRespondToClaimDisabled as jest.MockedFunction<
  typeof handleRespondToClaimDisabled
>;

const mockIsLegalRepresentativeUser = isLegalRepresentativeUser as jest.MockedFunction<
  typeof isLegalRepresentativeUser
>;

interface MakeReqArgs {
  caseReference?: string;
  validatedCaseId?: string;
}

const makeReq = ({ caseReference = '1234567890123456', validatedCaseId }: MakeReqArgs = {}): Request =>
  ({
    params: { caseReference },
    res: validatedCaseId === undefined ? { locals: {} } : { locals: { validatedCase: { id: validatedCaseId } } },
  }) as unknown as Request;

describe('respondToClaimFeatureMiddleware', () => {
  let res: Partial<Response>;
  let next: NextFunction;

  // Changed to an async function that awaits the middleware execution
  const invokeMiddleware = async (req: Request): Promise<void> => {
    await respondToClaimFeatureMiddleware(req, res as Response, next);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    next = jest.fn();
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
  });

  it('calls next when citizen respond-to-claim is enabled for the user', async () => {
    mockIsRespondToClaimEnabledForUser.mockResolvedValue(true);
    mockIsLegalRepresentativeUser.mockReturnValue(false);
    const req = makeReq();

    await invokeMiddleware(req);

    expect(next).toHaveBeenCalledTimes(1);
    expect(mockHandleRespondToClaimDisabled).not.toHaveBeenCalled();
    expect(mockIsRespondToClaimEnabledForRelease).not.toHaveBeenCalled();
  });

  it('redirects when citizen respond-to-claim is disabled for the user', async () => {
    mockIsRespondToClaimEnabledForUser.mockResolvedValue(false);
    mockIsLegalRepresentativeUser.mockReturnValue(false);
    const req = makeReq();

    await invokeMiddleware(req);

    expect(next).not.toHaveBeenCalled();
    expect(mockHandleRespondToClaimDisabled).toHaveBeenCalled();
    expect(mockIsRespondToClaimEnabledForRelease).not.toHaveBeenCalled();
  });

  it('redirects when legal rep and disabled for user and enabled for release', async () => {
    mockIsLegalRepresentativeUser.mockReturnValue(true);
    mockIsRespondToClaimEnabledForRelease.mockResolvedValue(true);
    mockIsRespondToClaimEnabledForUser.mockResolvedValue(false);
    const req = makeReq();

    await invokeMiddleware(req);

    expect(next).not.toHaveBeenCalled();
    expect(mockHandleRespondToClaimDisabled).toHaveBeenCalled();
  });

  it('redirects when legal rep and  enabled for user and disabled for release', async () => {
    mockIsLegalRepresentativeUser.mockReturnValue(true);
    mockIsRespondToClaimEnabledForRelease.mockResolvedValue(false);
    mockIsRespondToClaimEnabledForUser.mockResolvedValue(true);
    const req = makeReq();

    await invokeMiddleware(req);

    expect(next).not.toHaveBeenCalled();
    expect(mockHandleRespondToClaimDisabled).toHaveBeenCalled();
  });

  it('redirects when legal rep and  disabled for user and disabled for release', async () => {
    mockIsLegalRepresentativeUser.mockReturnValue(true);
    mockIsRespondToClaimEnabledForRelease.mockResolvedValue(false);
    mockIsRespondToClaimEnabledForUser.mockResolvedValue(false);
    const req = makeReq();

    await invokeMiddleware(req);

    expect(next).not.toHaveBeenCalled();
    expect(mockHandleRespondToClaimDisabled).toHaveBeenCalled();
  });

  it('calls next when legal respond-to-claim is enabled for the user and release', async () => {
    mockIsRespondToClaimEnabledForUser.mockResolvedValue(true);
    mockIsLegalRepresentativeUser.mockReturnValue(true);
    mockIsRespondToClaimEnabledForRelease.mockResolvedValue(true);
    const req = makeReq();

    await invokeMiddleware(req);

    expect(next).toHaveBeenCalledTimes(1);
    expect(mockHandleRespondToClaimDisabled).not.toHaveBeenCalled();
  });
});
