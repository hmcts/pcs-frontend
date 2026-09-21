import type { NextFunction, Request, Response } from 'express';

const mockIsJudgeUser = jest.fn();
const mockConfigGet = jest.fn();

jest.mock('../../../main/steps/utils', () => ({
  isJudgeUser: (...args: unknown[]) => mockIsJudgeUser(...args),
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

  it('allows non-judge users through', () => {
    mockIsJudgeUser.mockReturnValue(false);

    invokeMiddleware('/claims');

    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it.each(['/', '/claims', '/case/1234567890123456/dashboard'])('redirects judges from %s to XUI', path => {
    mockIsJudgeUser.mockReturnValue(true);

    invokeMiddleware(path);

    expect(res.redirect).toHaveBeenCalledWith(
      303,
      path.startsWith('/case/') ? `${CASE_DETAILS_BASE_URL}/1234567890123456` : XUI_URL
    );
    expect(next).not.toHaveBeenCalled();
  });

  it.each(['/case/1234567890123456/make-order', '/cases/1234567890123456/event/ext:makeOrder'])(
    'allows the %s judicial journey through',
    path => {
      mockIsJudgeUser.mockReturnValue(true);

      invokeMiddleware(path);

      expect(next).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    }
  );

  it('allows Docweave template requests made by the make-order journey through', () => {
    mockIsJudgeUser.mockReturnValue(true);

    invokeMiddleware('/docweave/templates/order-template');

    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('allows the session heartbeat through for an active judicial journey', () => {
    mockIsJudgeUser.mockReturnValue(true);

    invokeMiddleware('/active');

    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });
});
