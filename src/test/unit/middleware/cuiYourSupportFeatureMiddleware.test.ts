import type { NextFunction, Request, Response } from 'express';

jest.mock('@utils/isCuiYourSupportEnabled', () => ({
  isCuiYourSupportEnabled: jest.fn(),
}));

jest.mock('../../../main/middleware/handleRespondToClaimDisabled', () => ({
  handleRespondToClaimDisabled: jest.fn(),
}));

import { cuiYourSupportFeatureMiddleware, handleRespondToClaimDisabled } from '../../../main/middleware';

import { isCuiYourSupportEnabled } from '@utils/isCuiYourSupportEnabled';

const mockIsCuiYourSupportEnabled = isCuiYourSupportEnabled as jest.MockedFunction<typeof isCuiYourSupportEnabled>;
const mockHandleRespondToClaimDisabled = handleRespondToClaimDisabled as jest.MockedFunction<
  typeof handleRespondToClaimDisabled
>;

describe('cuiYourSupportFeatureMiddleware', () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { params: { caseReference: '1234567890123456' } } as unknown as Request;
    res = { locals: {} } as unknown as Response;
    next = jest.fn();
  });

  it('calls next when the CUI Your Support feature is enabled', async () => {
    mockIsCuiYourSupportEnabled.mockResolvedValue(true);

    await cuiYourSupportFeatureMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(mockHandleRespondToClaimDisabled).not.toHaveBeenCalled();
  });

  it('redirects (feature-disabled handler) and does not call next when disabled', async () => {
    mockIsCuiYourSupportEnabled.mockResolvedValue(false);

    await cuiYourSupportFeatureMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockHandleRespondToClaimDisabled).toHaveBeenCalledWith(req, res);
  });
});
