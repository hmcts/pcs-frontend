import type { NextFunction, Request, Response } from 'express';

import { clientContextSessionClearerMiddleware } from '../../../main/middleware/clientContextSessionClearer';

describe('clientContextSessionClearerMiddleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    res = {} as Response;

    next = jest.fn();
  });

  it('should delete clientContext for start-now path', () => {
    req = {
      path: '/case/1234567890123456/respond-to-claim/start-now',
      session: {
        clientContext: {
          selectedPartyId: 'abc',
        },
      },
    } as unknown as Request;

    clientContextSessionClearerMiddleware(req as Request, res as Response, next);

    expect(req.session?.clientContext).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should not delete clientContext for NON start-now path', () => {
    req = {
      path: '/case/1234567890123456/respond-to-claim/select-defendant',
      session: {
        clientContext: {
          selectedPartyId: 'abc',
        },
      },
    } as unknown as Request;

    clientContextSessionClearerMiddleware(req as Request, res as Response, next);

    expect(req.session?.clientContext).toBeTruthy();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
