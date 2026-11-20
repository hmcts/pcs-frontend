import type { NextFunction, Request, Response } from 'express';

const mockIsStaffUser = jest.fn();
const mockConfigGet = jest.fn();
const mockGetLaunchDarklyFlag = jest.fn();

jest.mock('../../../main/steps/utils', () => ({
  isStaffUser: (...args: unknown[]) => mockIsStaffUser(...args),
}));

jest.mock('../../../main/utils/getLaunchDarklyFlag', () => ({
  getLaunchDarklyFlag: (...args: unknown[]) => mockGetLaunchDarklyFlag(...args),
}));

jest.mock('config', () => ({
  get: (...args: unknown[]) => mockConfigGet(...args),
}));

import { staffXuiRedirectMiddleware } from '../../../main/middleware/staffXuiRedirect';

const XUI_URL = 'https://manage-case.aat.platform.hmcts.net';
const CASE_DETAILS_BASE_URL = 'https://manage-case.aat.platform.hmcts.net/cases/case-details/PCS/PCS';

describe('staffXuiRedirectMiddleware', () => {
  let res: Partial<Response>;
  let next: NextFunction;

  const invokeMiddleware = async (path: string): Promise<void> => {
    const req = { path } as unknown as Request;
    await staffXuiRedirectMiddleware(req, res as Response, next);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLaunchDarklyFlag.mockResolvedValue(true);
    mockConfigGet.mockImplementation((key: string) => {
      if (key === 'xui.uri') {
        return XUI_URL;
      }
      if (key === 'redirects.manageCaseReturnURL') {
        return CASE_DETAILS_BASE_URL;
      }
      throw new Error(`Unexpected config key: ${key}`);
    });
    res = { redirect: jest.fn() };
    next = jest.fn();
  });

  it('allows users who are not staff through', async () => {
    mockIsStaffUser.mockReturnValue(false);

    await invokeMiddleware('/claims');

    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it.each(['/', '/claims', '/case/1234567890123456/dashboard'])('redirects staff from %s to XUI', async path => {
    mockIsStaffUser.mockReturnValue(true);

    await invokeMiddleware(path);

    expect(mockGetLaunchDarklyFlag).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(
      303,
      path.startsWith('/case/') ? `${CASE_DETAILS_BASE_URL}/1234567890123456` : XUI_URL
    );
    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    '/case/1234567890123456/make-order',
    '/case/1234567890123456/make-order/sent-for-review',
    '/cases/1234567890123456/event/ext:makeOrder',
    '/cases/1234567890123456/event/ext%3AmakeOrder',
    '/case/1234567890123456/confirm-order-review',
    '/case/1234567890123456/confirm-order-review/check-your-answers',
    '/cases/1234567890123456/event/ext:confirmOrderReview',
    '/cases/1234567890123456/event/ext%3AconfirmOrderReview',
  ])('returns staff to the case from %s while make order is disabled', async path => {
    mockIsStaffUser.mockReturnValue(true);
    mockGetLaunchDarklyFlag.mockResolvedValue(false);

    await invokeMiddleware(path);

    expect(mockGetLaunchDarklyFlag).toHaveBeenCalledWith(expect.anything(), 'make-order-enabled', false);
    expect(res.redirect).toHaveBeenCalledWith(303, `${CASE_DETAILS_BASE_URL}/1234567890123456`);
    expect(next).not.toHaveBeenCalled();
  });

  it.each(['/docweave/templates', '/docweave/templates/order-template'])(
    'returns staff to XUI from %s while make order is disabled',
    async path => {
      mockIsStaffUser.mockReturnValue(true);
      mockGetLaunchDarklyFlag.mockResolvedValue(false);

      await invokeMiddleware(path);

      expect(mockGetLaunchDarklyFlag).toHaveBeenCalledWith(expect.anything(), 'make-order-enabled', false);
      expect(res.redirect).toHaveBeenCalledWith(303, XUI_URL);
      expect(next).not.toHaveBeenCalled();
    }
  );

  it.each([
    '/case/1234567890123456/record-warrant-return',
    '/case/1234567890123456/record-warrant-return/check-your-answers',
    '/case/1234567890123456/record-warrant-return/confirmed',
    '/cases/1234567890123456/event/ext:recordWarrantReturn',
    '/cases/1234567890123456/event/ext%3ArecordWarrantReturn',
  ])('returns staff to the case from %s while record warrant return is disabled', async path => {
    mockIsStaffUser.mockReturnValue(true);
    mockGetLaunchDarklyFlag.mockResolvedValue(false);

    await invokeMiddleware(path);

    expect(mockGetLaunchDarklyFlag).toHaveBeenCalledWith(expect.anything(), 'record-warrant-return-enabled', false);
    expect(res.redirect).toHaveBeenCalledWith(303, `${CASE_DETAILS_BASE_URL}/1234567890123456`);
    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    '/case/1234567890123456/record-warrant-return',
    '/case/1234567890123456/record-warrant-return/check-your-answers',
    '/case/1234567890123456/record-warrant-return/confirmed',
    '/cases/1234567890123456/event/ext:recordWarrantReturn',
    '/cases/1234567890123456/event/ext%3ArecordWarrantReturn',
  ])('does not redirect user back to XUI when record warrant return flag is enabled on %s', async path => {
    mockIsStaffUser.mockReturnValue(true);
    mockGetLaunchDarklyFlag.mockImplementation(async (_req: unknown, flag: string) => flag !== 'make-order-enabled');

    await invokeMiddleware(path);

    expect(mockGetLaunchDarklyFlag).toHaveBeenCalledTimes(1);
    expect(mockGetLaunchDarklyFlag).toHaveBeenCalledWith(expect.anything(), 'record-warrant-return-enabled', false);
    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it.each([
    '/case/1234567890123456/make-order',
    '/case/1234567890123456/make-order/sent-for-review',
    '/cases/1234567890123456/event/ext:makeOrder',
    '/cases/1234567890123456/event/ext%3AmakeOrder',
    '/case/1234567890123456/confirm-order-review',
    '/case/1234567890123456/confirm-order-review/check-your-answers',
    '/cases/1234567890123456/event/ext:confirmOrderReview',
    '/cases/1234567890123456/event/ext%3AconfirmOrderReview',
    '/docweave/templates',
    '/docweave/templates/order-template',
  ])('does not redirect user back to XUI when make order flag is enabled on %s', async path => {
    mockIsStaffUser.mockReturnValue(true);
    mockGetLaunchDarklyFlag.mockImplementation(async (_req: unknown, flag: string) => flag === 'make-order-enabled');

    await invokeMiddleware(path);

    expect(mockGetLaunchDarklyFlag).toHaveBeenCalledTimes(1);
    expect(mockGetLaunchDarklyFlag).toHaveBeenCalledWith(expect.anything(), 'make-order-enabled', false);
    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('returns staff to the case when an event they cannot use is handed over from XUI', async () => {
    mockIsStaffUser.mockReturnValue(true);

    await invokeMiddleware('/cases/1234567890123456/event/ext%3ArespondPossessionClaim');

    expect(res.redirect).toHaveBeenCalledWith(303, `${CASE_DETAILS_BASE_URL}/1234567890123456`);
  });

  it('redirects staff from a path with malformed encoding to XUI', async () => {
    mockIsStaffUser.mockReturnValue(true);

    await invokeMiddleware('/claims%E0%A4%A');

    expect(res.redirect).toHaveBeenCalledWith(303, XUI_URL);
  });

  it('allows the session heartbeat through for an active judicial journey', async () => {
    mockIsStaffUser.mockReturnValue(true);

    await invokeMiddleware('/active');

    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });
});
