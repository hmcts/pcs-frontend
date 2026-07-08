import type { Request } from 'express';

jest.mock('@utils/getLaunchDarklyFlag', () => ({
  getLaunchDarklyFlag: jest.fn(),
}));

jest.mock('../../../main/steps/utils/userRole', () => ({
  getUserType: jest.fn(),
}));

import { getUserType } from '../../../main/steps/utils/userRole';

import { getLaunchDarklyFlag } from '@utils/getLaunchDarklyFlag';
import { isRespondToClaimEnabledForUser } from '@utils/isRespondToClaimEnabledForUser';
import { ENABLE_CUI_RESPOND_TO_CLAIM, ENABLE_CUI_RESPOND_TO_CLAIM_LR } from '@utils/respondToClaimFlags';

const mockGetLaunchDarklyFlag = getLaunchDarklyFlag as jest.MockedFunction<typeof getLaunchDarklyFlag>;
const mockGetUserType = getUserType as jest.MockedFunction<typeof getUserType>;

const makeReq = (): Request => ({ session: { user: { uid: 'user-1' } } }) as unknown as Request;

describe('isRespondToClaimEnabledForUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('evaluates citizens against cui-respond-to-claim-enabled', async () => {
    mockGetUserType.mockReturnValue('citizen');
    mockGetLaunchDarklyFlag.mockResolvedValue(true);

    const req = makeReq();
    const result = await isRespondToClaimEnabledForUser(req);

    expect(result).toBe(true);
    expect(mockGetLaunchDarklyFlag).toHaveBeenCalledWith(req, ENABLE_CUI_RESPOND_TO_CLAIM, false);
  });

  it('evaluates legal representatives against cui-respond-to-claim-lr-enabled', async () => {
    mockGetUserType.mockReturnValue('legalrep');
    mockGetLaunchDarklyFlag.mockResolvedValue(false);

    const req = makeReq();
    const result = await isRespondToClaimEnabledForUser(req);

    expect(result).toBe(false);
    expect(mockGetLaunchDarklyFlag).toHaveBeenCalledWith(req, ENABLE_CUI_RESPOND_TO_CLAIM_LR, false);
  });

  it('defaults to false when LaunchDarkly returns false', async () => {
    mockGetUserType.mockReturnValue('citizen');
    mockGetLaunchDarklyFlag.mockResolvedValue(false);

    const result = await isRespondToClaimEnabledForUser(makeReq());

    expect(result).toBe(false);
  });
});
