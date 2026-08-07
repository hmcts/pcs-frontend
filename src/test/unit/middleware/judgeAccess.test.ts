import type { NextFunction, Request, Response } from 'express';

import { judgeAccessMiddleware } from '../../../main/middleware/judgeAccess';

describe('judgeAccessMiddleware', () => {
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    next = jest.fn();
  });

  it('allows judge users through', () => {
    const req = { session: { user: { roles: ['Caseworker-PCS-Judge'] } } } as unknown as Request;

    judgeAccessMiddleware(req, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns not found for non-judge users', () => {
    const req = { session: { user: { roles: ['caseworker'] } } } as unknown as Request;

    judgeAccessMiddleware(req, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith('Not Found');
    expect(next).not.toHaveBeenCalled();
  });
});
