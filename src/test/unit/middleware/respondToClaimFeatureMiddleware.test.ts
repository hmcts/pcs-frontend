import type { NextFunction, Request, Response } from 'express';

jest.mock('@utils/isRespondToClaimEnabledForUser', () => ({
  isRespondToClaimEnabledForUser: jest.fn(),
  isRespondToClaimEnabledForRelease: jest.fn(),
}));

jest.mock('../../../main/steps/utils/userRole', () => ({
  getUserType: jest.fn(),
}));

jest.mock('../../../main/middleware/handleRespondToClaimDisabled', () => ({
  handleRespondToClaimDisabled: jest.fn(),
}));

import { handleRespondToClaimDisabled, respondToClaimFeatureMiddleware } from '../../../main/middleware';

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

interface MakeReqArgs {
  caseReference?: string;
  validatedCaseId?: string;
}

const makeReq = ({ caseReference = '1234567890123456', validatedCaseId }: MakeReqArgs = {}): Request =>
  ({
    params: { caseReference },
    res: validatedCaseId === undefined ? { locals: {} } : { locals: { validatedCase: { id: validatedCaseId } } },
  }) as unknown as Request;

const makeRes = (): Response =>
  ({
    redirect: jest.fn(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  }) as unknown as Response;

describe('respondToClaimFeatureMiddleware', () => {
  let next: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    jest.clearAllMocks();
    next = jest.fn();
  });

  it('calls next when respond-to-claim is enabled for the user and release', async () => {
    mockIsRespondToClaimEnabledForRelease.mockResolvedValue(true);
    mockIsRespondToClaimEnabledForUser.mockResolvedValue(true);

    const req = makeReq();
    const res = makeRes();
    await respondToClaimFeatureMiddleware()(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(mockHandleRespondToClaimDisabled).not.toHaveBeenCalled();
  });

  it('redirects when disabled for user and enabled for release', async () => {
    mockIsRespondToClaimEnabledForRelease.mockResolvedValue(true);
    mockIsRespondToClaimEnabledForUser.mockResolvedValue(false);

    const req = makeReq();
    const res = makeRes();
    await respondToClaimFeatureMiddleware()(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockHandleRespondToClaimDisabled).toHaveBeenCalled();
  });

  it('redirects when enabled for user and disabled for release', async () => {
    mockIsRespondToClaimEnabledForRelease.mockResolvedValue(false);
    mockIsRespondToClaimEnabledForUser.mockResolvedValue(true);

    const req = makeReq();
    const res = makeRes();
    await respondToClaimFeatureMiddleware()(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockHandleRespondToClaimDisabled).toHaveBeenCalled();
  });

  it('redirects when disabled for user and disabled for release', async () => {
    mockIsRespondToClaimEnabledForRelease.mockResolvedValue(false);
    mockIsRespondToClaimEnabledForUser.mockResolvedValue(false);

    const req = makeReq();
    const res = makeRes();
    await respondToClaimFeatureMiddleware()(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockHandleRespondToClaimDisabled).toHaveBeenCalled();
  });
});
