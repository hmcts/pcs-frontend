import type { NextFunction, Request, Response } from 'express';

jest.mock('@utils/isRespondToClaimEnabledForUser', () => ({
  isRespondToClaimEnabledForUser: jest.fn(),
}));

jest.mock('../../../main/steps/utils/userRole', () => ({
  getUserType: jest.fn(),
}));

import { handleRespondToClaimDisabled } from '../../../main/middleware/handleRespondToClaimDisabled';
import { respondToClaimFeatureMiddleware } from '../../../main/middleware/respondToClaimFeatureMiddleware';
import { getUserType } from '../../../main/steps/utils/userRole';

import { isRespondToClaimEnabledForUser } from '@utils/isRespondToClaimEnabledForUser';

const mockIsRespondToClaimEnabledForUser = isRespondToClaimEnabledForUser as jest.MockedFunction<
  typeof isRespondToClaimEnabledForUser
>;
const mockGetUserType = getUserType as jest.MockedFunction<typeof getUserType>;

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
    mockGetUserType.mockReturnValue('citizen');
  });

  it('calls next when respond-to-claim is enabled for the user', async () => {
    mockIsRespondToClaimEnabledForUser.mockResolvedValue(true);

    const req = makeReq();
    const res = makeRes();
    await respondToClaimFeatureMiddleware()(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.redirect).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('redirects citizens to the case dashboard when disabled', async () => {
    mockIsRespondToClaimEnabledForUser.mockResolvedValue(false);
    mockGetUserType.mockReturnValue('citizen');

    const req = makeReq({ caseReference: '1234567890123456' });
    const res = makeRes();
    await respondToClaimFeatureMiddleware()(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(303, '/case/1234567890123456/dashboard');
  });

  it('returns 404 for legal representatives when disabled', async () => {
    mockIsRespondToClaimEnabledForUser.mockResolvedValue(false);
    mockGetUserType.mockReturnValue('legalrep');

    const req = makeReq();
    const res = makeRes();
    await respondToClaimFeatureMiddleware()(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith('Not Found');
  });
});

describe('handleRespondToClaimDisabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserType.mockReturnValue('citizen');
  });

  it('prefers validatedCase id over route param for citizen dashboard redirect', () => {
    mockGetUserType.mockReturnValue('citizen');

    const req = makeReq({ caseReference: '1111111111111111', validatedCaseId: '2222222222222222' });
    const res = makeRes();

    handleRespondToClaimDisabled(req, res);

    expect(res.redirect).toHaveBeenCalledWith(303, '/case/2222222222222222/dashboard');
  });

  it('redirects citizens to home when no case reference is available', () => {
    mockGetUserType.mockReturnValue('citizen');

    const req = {
      params: {},
      res: { locals: {} },
    } as unknown as Request;
    const res = makeRes();

    handleRespondToClaimDisabled(req, res);

    expect(res.redirect).toHaveBeenCalledWith(303, '/');
  });
});
