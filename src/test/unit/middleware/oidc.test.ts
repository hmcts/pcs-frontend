import config from 'config';
import { Application, NextFunction, Request, Response } from 'express';
import { Session } from 'express-session';
import * as jose from 'jose';
import { UserInfoResponse } from 'openid-client';

import { clearRefreshInProgressForTesting, oidcMiddleware } from '../../../main/middleware/oidc';
import type { OIDCModule } from '../../../main/modules/oidc';

interface CustomSession extends Session {
  user?: UserInfoResponse & {
    accessToken: string;
    idToken: string;
    refreshToken: string;
    uid?: string;
  };
  ccdCase?: unknown;
  returnTo?: string;
}

jest.mock('config');
jest.mock('jose');
jest.mock('@hmcts/nodejs-logging', () => ({
  Logger: {
    getLogger: jest.fn().mockReturnValue({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
  },
}));

// Create a minimal mock i18n object to satisfy type requirements
const createMockI18n = () => {
  return {
    language: 'en',
    languages: ['en'],
    changeLanguage: jest.fn(),
    getFixedT: jest.fn(),
    t: jest.fn(),
  } as unknown as import('i18next').i18n;
};

describe('oidcMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let mockOidcModule: Partial<OIDCModule>;

  const createValidToken = (expirySeconds: number): string => {
    const exp = Math.floor(Date.now() / 1000) + expirySeconds;
    // Create a minimal JWT-like structure (header.payload.signature)
    const payload = Buffer.from(JSON.stringify({ exp, sub: 'test-user' })).toString('base64url');
    return `header.${payload}.signature`;
  };

  beforeEach(() => {
    clearRefreshInProgressForTesting();
    jest.clearAllMocks();

    (config.get as jest.Mock).mockImplementation((key: string, defaultValue?: unknown) => {
      if (key === 'oidc.accessTokenEarlyRefreshSeconds') {
        return 30;
      }
      return defaultValue;
    });

    mockOidcModule = {
      refreshUserTokens: jest.fn(),
    };

    const mockSession: Partial<Session> & { save: Session['save'] } = {
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
      save: jest.fn(function (callback?: (err: unknown) => void) {
        if (callback) {
          callback(undefined);
        }
        return mockSession as Session;
      }) as Session['save'],
      touch: jest.fn(),
      resetMaxAge: jest.fn(),
    };

    mockRequest = {
      sessionID: 'test-session-id',
      session: mockSession as Request['session'],
      app: {
        locals: {
          nunjucksEnv: {
            addGlobal: jest.fn(),
          },
          oidc: mockOidcModule as OIDCModule,
        },
      } as unknown as Application,
      i18n: createMockI18n(),
      t: jest.fn((key: string) => key) as unknown as import('i18next').TFunction,
      language: 'en',
      originalUrl: '/test-path',
    };
    mockResponse = {
      redirect: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  it('should call next() when user is present in session with valid token (AC05)', async () => {
    const validToken = createValidToken(3600); // Valid for 1 hour
    (mockRequest.session as CustomSession).user = {
      sub: '123',
      uid: 'test-uid',
      accessToken: validToken,
      idToken: 'id-token',
      refreshToken: 'refresh-token',
    };

    (jose.decodeJwt as jest.Mock).mockReturnValue({
      exp: Math.floor(Date.now() / 1000) + 3600,
      sub: 'test-user',
    });

    await oidcMiddleware(
      mockRequest as Request & { i18n: import('i18next').i18n; t: import('i18next').TFunction },
      mockResponse as Response,
      nextFunction
    );

    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.redirect).not.toHaveBeenCalled();
    expect(mockOidcModule.refreshUserTokens).not.toHaveBeenCalled();
    expect(mockRequest.app?.locals.nunjucksEnv.addGlobal).toHaveBeenCalledWith(
      'user',
      (mockRequest.session as CustomSession).user
    );
  });

  it('should redirect to /login when user is not present in session', async () => {
    await oidcMiddleware(
      mockRequest as Request & { i18n: import('i18next').i18n; t: import('i18next').TFunction },
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.redirect).toHaveBeenCalledWith('/login');
    expect(nextFunction).not.toHaveBeenCalled();
    expect((mockRequest.session as CustomSession).returnTo).toBe('/test-path');
  });

  it('should redirect to /login when session is undefined', async () => {
    mockRequest.session = undefined;
    await oidcMiddleware(
      mockRequest as Request & { i18n: import('i18next').i18n; t: import('i18next').TFunction },
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.redirect).toHaveBeenCalledWith('/login');
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should detect expired token and refresh successfully (AC01, AC02)', async () => {
    const expiredToken = createValidToken(-60); // Expired 60 seconds ago
    (mockRequest.session as CustomSession).user = {
      sub: '123',
      uid: 'test-uid',
      accessToken: expiredToken,
      idToken: 'id-token',
      refreshToken: 'refresh-token',
    };

    (jose.decodeJwt as jest.Mock).mockReturnValue({
      exp: Math.floor(Date.now() / 1000) - 60,
      sub: 'test-user',
    });

    const newToken = createValidToken(3600);
    (mockOidcModule.refreshUserTokens as jest.Mock).mockResolvedValue({
      accessToken: newToken,
      refreshToken: 'new-refresh-token',
      idToken: 'new-id-token',
      accessTokenExp: Math.floor(Date.now() / 1000) + 3600,
    });

    await oidcMiddleware(
      mockRequest as Request & { i18n: import('i18next').i18n; t: import('i18next').TFunction },
      mockResponse as Response,
      nextFunction
    );

    expect(mockOidcModule.refreshUserTokens).toHaveBeenCalledWith('refresh-token');
    expect((mockRequest.session as CustomSession).user?.accessToken).toBe(newToken);
    expect((mockRequest.session as CustomSession).user?.refreshToken).toBe('new-refresh-token');
    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.redirect).not.toHaveBeenCalled();
  });

  it('should redirect to login when refresh fails (AC03)', async () => {
    const expiredToken = createValidToken(-60);
    (mockRequest.session as CustomSession).user = {
      sub: '123',
      uid: 'test-uid',
      accessToken: expiredToken,
      idToken: 'id-token',
      refreshToken: 'refresh-token',
    };

    (jose.decodeJwt as jest.Mock).mockReturnValue({
      exp: Math.floor(Date.now() / 1000) - 60,
      sub: 'test-user',
    });

    (mockOidcModule.refreshUserTokens as jest.Mock).mockRejectedValue(new Error('Refresh token invalid'));

    await oidcMiddleware(
      mockRequest as Request & { i18n: import('i18next').i18n; t: import('i18next').TFunction },
      mockResponse as Response,
      nextFunction
    );

    expect(mockOidcModule.refreshUserTokens).toHaveBeenCalled();
    expect(mockResponse.redirect).toHaveBeenCalledWith('/login');
    expect((mockRequest.session as CustomSession).user).toBeUndefined();
    expect((mockRequest.session as CustomSession).ccdCase).toBeUndefined();
    expect((mockRequest.session as CustomSession).returnTo).toBe('/test-path');
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should redirect to login when refresh token is missing', async () => {
    const expiredToken = createValidToken(-60);
    (mockRequest.session as CustomSession).user = {
      sub: '123',
      uid: 'test-uid',
      accessToken: expiredToken,
      idToken: 'id-token',
      refreshToken: undefined as unknown as string,
    };

    (jose.decodeJwt as jest.Mock).mockReturnValue({
      exp: Math.floor(Date.now() / 1000) - 60,
      sub: 'test-user',
    });

    await oidcMiddleware(
      mockRequest as Request & { i18n: import('i18next').i18n; t: import('i18next').TFunction },
      mockResponse as Response,
      nextFunction
    );

    expect(mockOidcModule.refreshUserTokens).not.toHaveBeenCalled();
    expect(mockResponse.redirect).toHaveBeenCalledWith('/login');
    expect((mockRequest.session as CustomSession).user).toBeUndefined();
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should handle token near expiry (within buffer)', async () => {
    const nearExpiryToken = createValidToken(20); // Expires in 20 seconds (within 30s buffer)
    (mockRequest.session as CustomSession).user = {
      sub: '123',
      uid: 'test-uid',
      accessToken: nearExpiryToken,
      idToken: 'id-token',
      refreshToken: 'refresh-token',
    };

    (jose.decodeJwt as jest.Mock).mockReturnValue({
      exp: Math.floor(Date.now() / 1000) + 20,
      sub: 'test-user',
    });

    const newToken = createValidToken(3600);
    (mockOidcModule.refreshUserTokens as jest.Mock).mockResolvedValue({
      accessToken: newToken,
      refreshToken: 'new-refresh-token',
      accessTokenExp: Math.floor(Date.now() / 1000) + 3600,
    });

    await oidcMiddleware(
      mockRequest as Request & { i18n: import('i18next').i18n; t: import('i18next').TFunction },
      mockResponse as Response,
      nextFunction
    );

    expect(mockOidcModule.refreshUserTokens).toHaveBeenCalled();
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should handle token decode failure gracefully', async () => {
    (mockRequest.session as CustomSession).user = {
      sub: '123',
      uid: 'test-uid',
      accessToken: 'invalid-token',
      idToken: 'id-token',
      refreshToken: 'refresh-token',
    };

    (jose.decodeJwt as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid token');
    });

    const newToken = createValidToken(3600);
    (mockOidcModule.refreshUserTokens as jest.Mock).mockResolvedValue({
      accessToken: newToken,
      refreshToken: 'new-refresh-token',
      accessTokenExp: Math.floor(Date.now() / 1000) + 3600,
    });

    await oidcMiddleware(
      mockRequest as Request & { i18n: import('i18next').i18n; t: import('i18next').TFunction },
      mockResponse as Response,
      nextFunction
    );

    expect(mockOidcModule.refreshUserTokens).toHaveBeenCalled();
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should prevent parallel refresh attempts for same session', async () => {
    const expiredToken = createValidToken(-60);
    (mockRequest.session as CustomSession).user = {
      sub: '123',
      uid: 'test-uid',
      accessToken: expiredToken,
      idToken: 'id-token',
      refreshToken: 'refresh-token',
    };

    (jose.decodeJwt as jest.Mock).mockReturnValue({
      exp: Math.floor(Date.now() / 1000) - 60,
      sub: 'test-user',
    });

    // Create a promise that resolves after a delay
    let resolveRefresh: (value: unknown) => void;
    const delayedRefresh = new Promise(resolve => {
      resolveRefresh = resolve;
    });

    (mockOidcModule.refreshUserTokens as jest.Mock).mockReturnValue(delayedRefresh);

    // Start first middleware call
    const promise1 = oidcMiddleware(
      mockRequest as Request & { i18n: import('i18next').i18n; t: import('i18next').TFunction },
      mockResponse as Response,
      nextFunction
    );

    // Start second middleware call (should wait for first)
    const promise2 = oidcMiddleware(
      mockRequest as Request & { i18n: import('i18next').i18n; t: import('i18next').TFunction },
      mockResponse as Response,
      nextFunction
    );

    // Resolve the refresh
    resolveRefresh!({
      accessToken: createValidToken(3600),
      refreshToken: 'new-refresh-token',
      accessTokenExp: Math.floor(Date.now() / 1000) + 3600,
    });

    await Promise.all([promise1, promise2]);

    // Should only call refresh once
    expect(mockOidcModule.refreshUserTokens).toHaveBeenCalledTimes(1);
  });
});
