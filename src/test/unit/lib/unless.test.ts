import { Request, Response } from 'express';

import { unless } from '../../../main/lib/unless';

describe('unless middleware', () => {
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;
  let mockMiddleware: jest.Mock;

  beforeEach(() => {
    mockRes = {};
    mockNext = jest.fn();
    mockMiddleware = jest.fn();
  });

  it('should skip middleware for exact matching path', () => {
    const mockReq = { path: '/test' } as Request;
    const unlessMiddleware = unless(['/test'], mockMiddleware);
    unlessMiddleware(mockReq, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockMiddleware).not.toHaveBeenCalled();
  });

  it('should execute middleware for non-matching path', () => {
    const mockReq = { path: '/test' } as Request;
    const unlessMiddleware = unless(['/skip'], mockMiddleware);
    unlessMiddleware(mockReq, mockRes as Response, mockNext);

    expect(mockMiddleware).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should skip middleware for wildcard path', () => {
    const mockReq = { path: '/api/users/123' } as Request;
    const unlessMiddleware = unless(['/api/*'], mockMiddleware);
    unlessMiddleware(mockReq, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockMiddleware).not.toHaveBeenCalled();
  });

  it('should handle multiple paths', () => {
    const paths = ['/test', '/api/*', '/health'];
    const unlessMiddleware = unless(paths, mockMiddleware);

    const mockReq1 = { path: '/test' } as Request;
    unlessMiddleware(mockReq1, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(mockMiddleware).not.toHaveBeenCalled();

    mockNext.mockClear();
    mockMiddleware.mockClear();

    const mockReq2 = { path: '/other' } as Request;
    unlessMiddleware(mockReq2, mockRes as Response, mockNext);
    expect(mockMiddleware).toHaveBeenCalled();
  });
});
