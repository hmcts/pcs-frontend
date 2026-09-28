import type { NextFunction, Request, Response } from 'express';

const mockIsStaffUser = jest.fn();
const mockConfigGet = jest.fn();

jest.mock('../../../main/steps/utils', () => ({
  isStaffUser: (...args: unknown[]) => mockIsStaffUser(...args),
}));

jest.mock('config', () => ({
  get: (...args: unknown[]) => mockConfigGet(...args),
}));

import { judgeXuiRedirectMiddleware } from '../../../main/middleware/judgeXuiRedirect';

const XUI_URL = 'https://manage-case.aat.platform.hmcts.net';
const CASE_DETAILS_BASE_URL = 'https://manage-case.aat.platform.hmcts.net/cases/case-details/PCS/PCS';

describe('judgeXuiRedirectMiddleware', () => {
  let res: Partial<Response>;
  let next: NextFunction;

  const invokeMiddleware = (path: string): void => {
    const req = { path } as unknown as Request;
    judgeXuiRedirectMiddleware(req, res as Response, next);
  };

  beforeEach(() => {
    jest.clearAllMocks();
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

  it('allows users who are not staff through', () => {
    mockIsStaffUser.mockReturnValue(false);

    invokeMiddleware('/claims');

    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it.each(['/', '/claims', '/case/1234567890123456/dashboard'])('redirects staff from %s to XUI', path => {
    mockIsStaffUser.mockReturnValue(true);

    invokeMiddleware(path);

    expect(res.redirect).toHaveBeenCalledWith(
      303,
      path.startsWith('/case/') ? `${CASE_DETAILS_BASE_URL}/1234567890123456` : XUI_URL
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns staff to the case when an event they cannot use is handed over from XUI', () => {
    mockIsStaffUser.mockReturnValue(true);

    invokeMiddleware('/cases/1234567890123456/event/ext%3ArespondPossessionClaim');

    expect(res.redirect).toHaveBeenCalledWith(303, `${CASE_DETAILS_BASE_URL}/1234567890123456`);
  });

  it('redirects staff from a path with malformed encoding to XUI', () => {
    mockIsStaffUser.mockReturnValue(true);

    invokeMiddleware('/claims%E0%A4%A');

    expect(res.redirect).toHaveBeenCalledWith(303, XUI_URL);
  });

  it.each([
    '/case/1234567890123456/make-order',
    '/cases/1234567890123456/event/ext:makeOrder',
    // How XUI builds the hand-off: encodeURIComponent(eventId)
    '/cases/1234567890123456/event/ext%3AmakeOrder',
  ])('allows the %s judicial journey through', path => {
    mockIsStaffUser.mockReturnValue(true);

    invokeMiddleware(path);

    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('allows Docweave template requests made by the make-order journey through', () => {
    mockIsStaffUser.mockReturnValue(true);

    invokeMiddleware('/docweave/templates/order-template');

    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('allows the session heartbeat through for an active judicial journey', () => {
    mockIsStaffUser.mockReturnValue(true);

    invokeMiddleware('/active');

    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });
});
