import type { NextFunction, Request, Response } from 'express';

const mockIsLegalRepresentativeUser = jest.fn();

jest.mock('../../../main/steps/utils', () => ({
  isLegalRepresentativeUser: (...args: unknown[]) => mockIsLegalRepresentativeUser(...args),
}));

jest.mock('../../../main/middleware/handleRespondToClaimDisabled', () => ({
  handleRespondToClaimDisabled: jest.fn(),
}));

import { handleRespondToClaimDisabled } from '../../../main/middleware';
import { citizenOnlyStepsAccessMiddleware } from '../../../main/middleware/citizenOnlyStepsAccess';

const mockHandleRespondToClaimDisabled = handleRespondToClaimDisabled as jest.MockedFunction<
  typeof handleRespondToClaimDisabled
>;

const YOUR_SUPPORT_PATHS = [
  '/case/1234567890123456/respond-to-claim/reasonable-adjustments-triage',
  '/case/1234567890123456/respond-to-claim/reasonable-adjustments-confirmation',
  '/case/1234567890123456/respond-to-claim/reasonable-adjustments-cancelled',
  '/case/1234567890123456/respond-to-claim/reasonable-adjustments-error',
  '/case/1234567890123456/respond-to-claim/reasonable-adjustments/callback/abc-123',
];

describe('citizenOnlyStepsAccessMiddleware', () => {
  let res: Response;
  let next: NextFunction;
  const invoke = (path: string): void => {
    (citizenOnlyStepsAccessMiddleware as unknown as (req: Request, res: Response, next: NextFunction) => void)(
      { path } as unknown as Request,
      res,
      next
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    res = {} as unknown as Response;
    next = jest.fn();
  });

  it.each(YOUR_SUPPORT_PATHS)('lets citizens through %s', path => {
    mockIsLegalRepresentativeUser.mockReturnValue(false);

    invoke(path);

    expect(next).toHaveBeenCalledTimes(1);
    expect(mockHandleRespondToClaimDisabled).not.toHaveBeenCalled();
  });

  it('lets legal representatives through paths that are not citizen-only', () => {
    mockIsLegalRepresentativeUser.mockReturnValue(true);

    invoke('/case/1234567890123456/respond-to-claim/select-defendant');
    invoke('/case/1234567890123456/respond-to-claim/task-list');
    invoke('/case/1234567890123456/dashboard');

    expect(next).toHaveBeenCalledTimes(3);
    expect(mockHandleRespondToClaimDisabled).not.toHaveBeenCalled();
  });

  it.each(YOUR_SUPPORT_PATHS)('bounces legal representatives away from %s', path => {
    mockIsLegalRepresentativeUser.mockReturnValue(true);

    invoke(path);

    expect(mockHandleRespondToClaimDisabled).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
  });

  it('does not match look-alike paths outside the Your Support pages', () => {
    mockIsLegalRepresentativeUser.mockReturnValue(true);

    invoke('/case/1234567890123456/respond-to-claim/reasonable-adjustments-triage/extra');
    invoke('/case/1234567890123456/other-journey/reasonable-adjustments-triage');

    expect(next).toHaveBeenCalledTimes(2);
    expect(mockHandleRespondToClaimDisabled).not.toHaveBeenCalled();
  });
});
