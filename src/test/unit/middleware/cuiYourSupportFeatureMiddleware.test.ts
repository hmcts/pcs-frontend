import type { NextFunction, Request, Response } from 'express';

jest.mock('@utils/isCuiYourSupportEnabled', () => ({
  isCuiYourSupportEnabled: jest.fn(),
}));

const mockSafeRedirect303 = jest.fn();
jest.mock('@utils/safeRedirect', () => ({
  safeRedirect303: mockSafeRedirect303,
}));

import { cuiYourSupportFeatureMiddleware } from '../../../main/middleware';

import { isCuiYourSupportEnabled } from '@utils/isCuiYourSupportEnabled';

const mockIsCuiYourSupportEnabled = isCuiYourSupportEnabled as jest.MockedFunction<typeof isCuiYourSupportEnabled>;

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
    expect(mockSafeRedirect303).not.toHaveBeenCalled();
  });

  it('continues the journey at language-used (not the dashboard) and does not call next when disabled', async () => {
    mockIsCuiYourSupportEnabled.mockResolvedValue(false);

    await cuiYourSupportFeatureMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockSafeRedirect303).toHaveBeenCalledWith(
      res,
      '/case/1234567890123456/respond-to-claim/language-used?nav=1',
      '/case/1234567890123456',
      ['/case']
    );
  });
});
