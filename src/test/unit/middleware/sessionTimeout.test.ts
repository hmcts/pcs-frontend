import type { NextFunction, Request, Response } from 'express';

import { sessionTimeoutMiddleware } from '../../../main/middleware/sessionTimeout';

describe('sessionTimeoutMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockNext = jest.fn();
    mockReq = {
      app: {
        locals: {},
      } as unknown as Request['app'],
    };

    mockRes = {
      locals: {},
      render: jest.fn(),
    };
  });

  it('should copy sessionTimeout from app.locals to res.locals when present', () => {
    const sessionTimeoutConfig = {
      sessionTimeoutMinutes: 30,
      sessionWarningMinutes: 5,
      checkIntervalSeconds: 60,
    };

    mockReq.app!.locals.sessionTimeout = sessionTimeoutConfig;

    sessionTimeoutMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.locals!.sessionTimeout).toEqual(sessionTimeoutConfig);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should not set sessionTimeout in res.locals when not present in app.locals', () => {
    sessionTimeoutMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.locals!.sessionTimeout).toBeUndefined();
    expect(mockNext).toHaveBeenCalled();
  });

  it('should wrap res.render to merge res.locals with options', () => {
    const mockRender = jest.fn();
    mockRes.render = mockRender.bind(mockRes);

    const view = 'test-view';
    const options = { title: 'Test Title' };
    mockRes.locals = { user: { name: 'Test User' } };

    sessionTimeoutMiddleware(mockReq as Request, mockRes as Response, mockNext);

    // Call the wrapped render function
    (mockRes.render as jest.Mock)(view, options);

    expect(mockRender).toHaveBeenCalledWith(
      view,
      {
        user: { name: 'Test User' },
        title: 'Test Title',
      },
      undefined
    );
  });

  it('should handle render with callback', () => {
    const mockRender = jest.fn();
    mockRes.render = mockRender.bind(mockRes);

    const view = 'test-view';
    const options = { title: 'Test Title' };
    const callback = jest.fn();
    mockRes.locals = { lang: 'en' };

    sessionTimeoutMiddleware(mockReq as Request, mockRes as Response, mockNext);

    // Call the wrapped render function with callback
    (mockRes.render as jest.Mock)(view, options, callback);

    expect(mockRender).toHaveBeenCalledWith(
      view,
      {
        lang: 'en',
        title: 'Test Title',
      },
      callback
    );
  });

  it('should handle render with only view parameter', () => {
    const mockRender = jest.fn();
    mockRes.render = mockRender.bind(mockRes);

    const view = 'test-view';
    mockRes.locals = { pageTitle: 'Test Page' };

    sessionTimeoutMiddleware(mockReq as Request, mockRes as Response, mockNext);

    // Call the wrapped render function with only view
    (mockRes.render as jest.Mock)(view);

    expect(mockRender).toHaveBeenCalledWith(view, { pageTitle: 'Test Page' }, undefined);
  });

  it('should merge res.locals with options, with options taking precedence', () => {
    const mockRender = jest.fn();
    mockRes.render = mockRender.bind(mockRes);

    const view = 'test-view';
    mockRes.locals = { title: 'Local Title', user: { name: 'Local User' } };
    const options = { title: 'Option Title' };

    sessionTimeoutMiddleware(mockReq as Request, mockRes as Response, mockNext);

    (mockRes.render as jest.Mock)(view, options);

    // Options should override res.locals values with same keys
    expect(mockRender).toHaveBeenCalledWith(
      view,
      {
        title: 'Option Title',
        user: { name: 'Local User' },
      },
      undefined
    );
  });

  it('should call next() after setting up middleware', () => {
    sessionTimeoutMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith();
  });
});
