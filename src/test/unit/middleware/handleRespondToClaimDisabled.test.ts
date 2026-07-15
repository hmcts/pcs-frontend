import type { Request, Response } from 'express';

import { handleRespondToClaimDisabled } from '../../../main/middleware';
import { getUserType } from '../../../main/steps/utils';

import { redirectToCaseManagement } from '@utils/legalRepresentativeRedirectHandler';

jest.mock('@utils/isRespondToClaimEnabledForUser', () => ({
  isRespondToClaimEnabledForUser: jest.fn(),
}));

jest.mock('../../../main/steps/utils/userRole', () => ({
  ...jest.requireActual('../../../main/steps/utils/userRole'),
  getUserType: jest.fn(),
}));

jest.mock('@utils/legalRepresentativeRedirectHandler', () => ({
  redirectToCaseManagement: jest.fn(),
}));

const mockGetUserType = getUserType as jest.MockedFunction<typeof getUserType>;

const mockRedirectToCaseManagement = redirectToCaseManagement as jest.MockedFunction<typeof redirectToCaseManagement>;

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

  it('redirects legal reps to case management', () => {
    mockGetUserType.mockReturnValue('legalrep');

    const req = makeReq({ caseReference: '1111111111111111', validatedCaseId: '2222222222222222' });
    const res = makeRes();

    handleRespondToClaimDisabled(req, res);

    expect(mockRedirectToCaseManagement).toHaveBeenCalledWith(res, '2222222222222222');
  });
});
