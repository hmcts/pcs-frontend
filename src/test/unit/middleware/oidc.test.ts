import { Application, NextFunction, Request, Response } from 'express';
import { Session } from 'express-session';
import { UserInfoResponse } from 'openid-client';

import { oidcMiddleware } from '../../../main/middleware/oidc';

interface CustomSession extends Session {
  user?: UserInfoResponse & {
    accessToken: string;
    idToken: string;
    refreshToken: string;
  };
}

describe('oidcMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      session: {
        id: 'test-session',
        cookie: {
          secure: false,
          originalMaxAge: 3600000,
          maxAge: 3600000,
          httpOnly: true,
          path: '/',
        },
        regenerate: jest.fn(),
        destroy: jest.fn(),
        reload: jest.fn(),
        save: jest.fn(),
        touch: jest.fn(),
        resetMaxAge: jest.fn(),
      } as CustomSession,
      app: {
        locals: {
          nunjucksEnv: {
            addGlobal: jest.fn(),
          },
        },
      } as unknown as Application,
    };
    mockResponse = {
      redirect: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  it('should call next() when user is present in session', () => {
    (mockRequest.session as CustomSession).user = {
      sub: '123',
      accessToken: 'token',
      idToken: 'id-token',
      refreshToken: 'refresh-token',
    };
    oidcMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.redirect).not.toHaveBeenCalled();
    expect(mockRequest.app?.locals.nunjucksEnv.addGlobal).toHaveBeenCalledWith(
      'user',
      (mockRequest.session as CustomSession).user
    );
  });

  it('should redirect to /login when user is not present in session', () => {
    oidcMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.redirect).toHaveBeenCalledWith('/login');
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should redirect to /login when session is undefined', () => {
    mockRequest.session = undefined;
    oidcMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.redirect).toHaveBeenCalledWith('/login');
    expect(nextFunction).not.toHaveBeenCalled();
  });
});
