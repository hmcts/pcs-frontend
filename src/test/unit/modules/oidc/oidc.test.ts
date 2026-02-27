import config from 'config';
import { Express, NextFunction, Request, Response } from 'express';
import {
  authorizationCodeGrant,
  buildAuthorizationUrl,
  buildEndSessionUrl,
  calculatePKCECodeChallenge,
  discovery,
  fetchUserInfo,
  randomNonce,
  randomPKCECodeVerifier,
} from 'openid-client';

import { OIDCAuthenticationError, OIDCCallbackError, OIDCModule } from '../../../../main/modules/oidc';

jest.mock('config');
jest.mock('openid-client', () => ({
  discovery: jest.fn(),
  randomPKCECodeVerifier: jest.fn(),
  randomNonce: jest.fn(),
  calculatePKCECodeChallenge: jest.fn(),
  buildAuthorizationUrl: jest.fn(),
  authorizationCodeGrant: jest.fn(),
  fetchUserInfo: jest.fn(),
  buildEndSessionUrl: jest.fn(),
}));
jest.mock('@modules/logger', () => ({
  Logger: {
    getLogger: jest.fn().mockReturnValue({
      info: jest.fn(),
      error: jest.fn(),
    }),
  },
}));

describe('OIDCModule', () => {
  let oidcModule: OIDCModule;
  let mockApp: Express;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  const createMockSession = (overrides = {}) => ({
    id: 'test-session-id',
    cookie: {
      originalMaxAge: 3600000,
      expires: new Date(),
      secure: false,
      httpOnly: true,
      path: '/',
      sameSite: 'lax' as const,
    },
    regenerate: jest.fn(),
    destroy: jest.fn(),
    reload: jest.fn(),
    save: jest.fn(),
    touch: jest.fn(),
    resetMaxAge: jest.fn(),
    codeVerifier: undefined,
    nonce: undefined,
    user: undefined,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    (config.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'oidc') {
        return {
          issuer: 'http://test-issuer',
          clientId: 'test-client-id',
          redirectUri: 'http://localhost:3000/oauth2/callback',
          scope: 'openid profile',
        };
      }
      if (key === 'secrets.pcs.pcs-frontend-idam-secret') {
        return 'test-secret';
      }
      return undefined;
    });

    (discovery as jest.Mock).mockResolvedValue({
      serverMetadata: () => ({
        token_endpoint: 'http://test-issuer/token',
        supportsPKCE: () => true,
      }),
    });

    oidcModule = new OIDCModule();
    mockApp = {
      get: jest.fn(),
      set: jest.fn(),
      use: jest.fn(),
      locals: {
        nunjucksEnv: {
          addGlobal: jest.fn(),
        },
      },
    } as unknown as Express;
    mockRequest = {
      session: createMockSession(),
      protocol: 'http',
      get: jest.fn().mockReturnValue('localhost:3000'),
      originalUrl: '/oauth2/callback?code=test_code',
    };
    mockResponse = {
      redirect: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('constructor', () => {
    it('should create an instance and call setupClient', () => {
      expect(oidcModule).toBeInstanceOf(OIDCModule);
      expect(discovery).toHaveBeenCalled();
    });
  });

  describe('getCurrentUrl', () => {
    it('should return correct URL from request', () => {
      const mockReq = {
        protocol: 'https',
        get: jest.fn().mockReturnValue('example.com'),
        originalUrl: '/test/path?param=value',
      } as unknown as Request;

      const result = OIDCModule.getCurrentUrl(mockReq);

      expect(result.href).toBe('https://example.com/test/path?param=value');
      expect(mockReq.get).toHaveBeenCalledWith('host');
    });

    it('should handle different protocols and hosts', () => {
      const mockReq = {
        protocol: 'http',
        get: jest.fn().mockReturnValue('localhost:3000'),
        originalUrl: '/auth/callback',
      } as unknown as Request;

      const result = OIDCModule.getCurrentUrl(mockReq);

      expect(result.href).toBe('http://localhost:3000/auth/callback');
    });
  });

  describe('setupClient', () => {
    it('should successfully setup the OIDC client', async () => {
      await oidcModule['setupClient']();

      expect(discovery).toHaveBeenCalledWith(expect.any(URL), 'test-client-id', 'test-secret');
    });

    it('should throw OIDCAuthenticationError when setup fails', async () => {
      (discovery as jest.Mock).mockRejectedValue(new Error('Discovery failed'));

      await expect(oidcModule['setupClient']()).rejects.toThrow(OIDCAuthenticationError);
    });
  });

  describe('enableFor', () => {
    it('should set trust proxy to true', () => {
      oidcModule.enableFor(mockApp);
      expect(mockApp.set).toHaveBeenCalledWith('trust proxy', true);
    });

    describe('middleware for client config setup', () => {
      it('should call next when client config exists', async () => {
        oidcModule.enableFor(mockApp);
        const middleware = (mockApp.use as jest.Mock).mock.calls[0][0];

        await middleware(mockRequest, mockResponse, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should setup client when config does not exist and call next', async () => {
        oidcModule['clientConfig'] = undefined as unknown as (typeof oidcModule)['clientConfig'];
        oidcModule.enableFor(mockApp);
        const middleware = (mockApp.use as jest.Mock).mock.calls[0][0];

        await middleware(mockRequest, mockResponse, mockNext);

        expect(discovery).toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should call next with error when setup fails', async () => {
        oidcModule['clientConfig'] = undefined as unknown as (typeof oidcModule)['clientConfig'];
        (discovery as jest.Mock).mockRejectedValue(new Error('Setup failed'));

        oidcModule.enableFor(mockApp);
        const middleware = (mockApp.use as jest.Mock).mock.calls[0][0];

        await middleware(mockRequest, mockResponse, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      });
    });

    describe('login route', () => {
      it('should redirect to authorization URL', async () => {
        const mockAuthUrl = 'http://test-issuer/auth';
        (buildAuthorizationUrl as jest.Mock).mockReturnValue({ href: mockAuthUrl });
        (randomPKCECodeVerifier as jest.Mock).mockReturnValue('test-verifier');
        (randomNonce as jest.Mock).mockReturnValue('test-nonce');
        (calculatePKCECodeChallenge as jest.Mock).mockResolvedValue('test-challenge');

        oidcModule.enableFor(mockApp);
        const loginHandler = (mockApp.get as jest.Mock).mock.calls[0][1];
        await loginHandler(mockRequest, mockResponse, mockNext);

        expect(mockResponse.redirect).toHaveBeenCalledWith(mockAuthUrl);
        expect(mockRequest.session).toHaveProperty('codeVerifier', 'test-verifier');
      });

      it('should handle login errors', async () => {
        (randomPKCECodeVerifier as jest.Mock).mockImplementation(() => {
          throw new Error('Random generation failed');
        });

        oidcModule.enableFor(mockApp);
        const loginHandler = (mockApp.get as jest.Mock).mock.calls[0][1];
        await loginHandler(mockRequest, mockResponse, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(OIDCAuthenticationError));
      });

      it('should handle calculatePKCECodeChallenge errors', async () => {
        (randomPKCECodeVerifier as jest.Mock).mockReturnValue('test-verifier');
        (calculatePKCECodeChallenge as jest.Mock).mockRejectedValue(new Error('Challenge calculation failed'));

        oidcModule.enableFor(mockApp);
        const loginHandler = (mockApp.get as jest.Mock).mock.calls[0][1];
        await loginHandler(mockRequest, mockResponse, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(OIDCAuthenticationError));
      });

      it('should handle buildAuthorizationUrl errors', async () => {
        (randomPKCECodeVerifier as jest.Mock).mockReturnValue('test-verifier');
        (calculatePKCECodeChallenge as jest.Mock).mockResolvedValue('test-challenge');
        (buildAuthorizationUrl as jest.Mock).mockImplementation(() => {
          throw new Error('Authorization URL build failed');
        });

        oidcModule.enableFor(mockApp);
        const loginHandler = (mockApp.get as jest.Mock).mock.calls[0][1];
        await loginHandler(mockRequest, mockResponse, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(OIDCAuthenticationError));
      });

      it('should use nonce when PKCE is not supported', async () => {
        const mockAuthUrl = 'http://test-issuer/auth';
        (buildAuthorizationUrl as jest.Mock).mockReturnValue({ href: mockAuthUrl });
        (randomNonce as jest.Mock).mockReturnValue('test-nonce');
        (randomPKCECodeVerifier as jest.Mock).mockReturnValue('test-verifier');
        (calculatePKCECodeChallenge as jest.Mock).mockResolvedValue('test-challenge');

        (discovery as jest.Mock).mockResolvedValue({
          serverMetadata: () => ({
            token_endpoint: 'http://test-issuer/token',
            supportsPKCE: () => false,
          }),
        });

        oidcModule = new OIDCModule();
        await oidcModule['setupClient']();

        mockApp = {
          get: jest.fn(),
          set: jest.fn(),
          use: jest.fn(),
          locals: {
            nunjucksEnv: {
              addGlobal: jest.fn(),
            },
          },
        } as unknown as Express;

        oidcModule.enableFor(mockApp);
        const loginHandler = (mockApp.get as jest.Mock).mock.calls[0][1];
        await loginHandler(mockRequest, mockResponse, mockNext);

        expect(mockResponse.redirect).toHaveBeenCalledWith(mockAuthUrl);
        expect(mockRequest.session).toHaveProperty('nonce', 'test-nonce');
        expect(buildAuthorizationUrl).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            nonce: 'test-nonce',
            redirect_uri: 'http://localhost:3000/oauth2/callback',
            scope: 'openid profile',
          })
        );
      });
    });

    describe('callback route', () => {
      it('should handle successful authentication', async () => {
        const mockTokens = {
          access_token: 'test-token',
          id_token: 'test-id-token',
          refresh_token: 'test-refresh-token',
          claims: jest.fn().mockReturnValue({ sub: 'test-sub' }),
        };
        const mockUserInfo = {
          email: 'test@example.com',
          given_name: 'Test',
          family_name: 'User',
          roles: ['test-role'],
        };

        (authorizationCodeGrant as jest.Mock).mockResolvedValue(mockTokens);
        (fetchUserInfo as jest.Mock).mockResolvedValue(mockUserInfo);

        mockRequest.session = createMockSession({
          codeVerifier: 'test-verifier',
          nonce: 'test-nonce',
          save: jest.fn().mockImplementation(function (callback) {
            callback(null);
          }),
        });

        oidcModule.enableFor(mockApp);
        const callbackHandler = (mockApp.get as jest.Mock).mock.calls[1][1];
        await callbackHandler(mockRequest, mockResponse, mockNext);

        expect(mockRequest.session).toHaveProperty('user', {
          accessToken: 'test-token',
          idToken: 'test-id-token',
          refreshToken: 'test-refresh-token',
          ...mockUserInfo,
        });
        expect(mockRequest.session).not.toHaveProperty('codeVerifier');
        expect(mockRequest.session).not.toHaveProperty('nonce');
        expect(mockResponse.redirect).toHaveBeenCalledWith('/');
      });

      it('should redirect to returnTo URL when present', async () => {
        const mockTokens = {
          access_token: 'test-token',
          id_token: 'test-id-token',
          refresh_token: 'test-refresh-token',
          claims: jest.fn().mockReturnValue({ sub: 'test-sub' }),
        };
        const mockUserInfo = {
          email: 'test@example.com',
        };

        (authorizationCodeGrant as jest.Mock).mockResolvedValue(mockTokens);
        (fetchUserInfo as jest.Mock).mockResolvedValue(mockUserInfo);

        mockRequest.session = createMockSession({
          codeVerifier: 'test-verifier',
          nonce: 'test-nonce',
          returnTo: '/dashboard',
          save: jest.fn().mockImplementation(function (callback) {
            callback(null);
          }),
        });

        oidcModule.enableFor(mockApp);
        const callbackHandler = (mockApp.get as jest.Mock).mock.calls[1][1];
        await callbackHandler(mockRequest, mockResponse, mockNext);

        expect(mockResponse.redirect).toHaveBeenCalledWith('/dashboard');
        expect(mockRequest.session).not.toHaveProperty('returnTo');
      });

      it('should handle token exchange errors', async () => {
        (authorizationCodeGrant as jest.Mock).mockRejectedValue(new Error('Token exchange failed'));

        mockRequest.session = createMockSession({
          codeVerifier: 'test-verifier',
          nonce: 'test-nonce',
        });

        oidcModule.enableFor(mockApp);
        const callbackHandler = (mockApp.get as jest.Mock).mock.calls[1][1];
        await callbackHandler(mockRequest, mockResponse, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(OIDCCallbackError));
      });

      it('should handle fetchUserInfo errors', async () => {
        const mockTokens = {
          access_token: 'test-token',
          id_token: 'test-id-token',
          refresh_token: 'test-refresh-token',
          claims: jest.fn().mockReturnValue({ sub: 'test-sub' }),
        };

        (authorizationCodeGrant as jest.Mock).mockResolvedValue(mockTokens);
        (fetchUserInfo as jest.Mock).mockRejectedValue(new Error('User info fetch failed'));

        mockRequest.session = createMockSession({
          codeVerifier: 'test-verifier',
          nonce: 'test-nonce',
        });

        oidcModule.enableFor(mockApp);
        const callbackHandler = (mockApp.get as jest.Mock).mock.calls[1][1];
        await callbackHandler(mockRequest, mockResponse, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(OIDCCallbackError));
      });

      it('should handle session save errors', async () => {
        const mockTokens = {
          access_token: 'test-token',
          id_token: 'test-id-token',
          refresh_token: 'test-refresh-token',
          claims: jest.fn().mockReturnValue({ sub: 'test-sub' }),
        };
        const mockUserInfo = {
          email: 'test@example.com',
        };

        (authorizationCodeGrant as jest.Mock).mockResolvedValue(mockTokens);
        (fetchUserInfo as jest.Mock).mockResolvedValue(mockUserInfo);

        mockRequest.session = createMockSession({
          codeVerifier: 'test-verifier',
          nonce: 'test-nonce',
          save: jest.fn().mockImplementation(function (callback) {
            callback(null);
          }),
        });

        oidcModule.enableFor(mockApp);
        const callbackHandler = (mockApp.get as jest.Mock).mock.calls[1][1];
        await callbackHandler(mockRequest, mockResponse, mockNext);

        expect(mockResponse.redirect).toHaveBeenCalledWith('/');
      });

      it('should handle missing session data', async () => {
        const mockTokens = {
          access_token: 'test-token',
          id_token: 'test-id-token',
          refresh_token: 'test-refresh-token',
          claims: jest.fn().mockReturnValue({ sub: 'test-sub' }),
        };

        (authorizationCodeGrant as jest.Mock).mockResolvedValue(mockTokens);

        mockRequest.session = createMockSession({});

        oidcModule.enableFor(mockApp);
        const callbackHandler = (mockApp.get as jest.Mock).mock.calls[1][1];
        await callbackHandler(mockRequest, mockResponse, mockNext);

        expect(authorizationCodeGrant).toHaveBeenCalledWith(
          expect.any(Object),
          expect.any(URL),
          expect.objectContaining({
            pkceCodeVerifier: undefined,
            expectedNonce: undefined,
            idTokenExpected: true,
          })
        );
      });
    });

    describe('logout route', () => {
      it('should destroy session and redirect to logout URL', async () => {
        const mockLogoutUrl = 'http://test-issuer/logout';
        (buildEndSessionUrl as jest.Mock).mockReturnValue({ href: mockLogoutUrl });

        mockRequest.session = createMockSession({
          user: {
            idToken: 'test-id-token',
          },
          destroy: jest.fn().mockImplementation(function (callback) {
            callback(null);
          }),
        });

        oidcModule.enableFor(mockApp);
        const logoutHandler = (mockApp.get as jest.Mock).mock.calls[2][1];
        await logoutHandler(mockRequest, mockResponse, mockNext);

        expect(buildEndSessionUrl).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            post_logout_redirect_uri: 'http://localhost:3000',
            id_token_hint: 'test-id-token',
          })
        );
        expect(mockRequest.session.destroy).toHaveBeenCalled();
        expect(mockResponse.redirect).toHaveBeenCalledWith(mockLogoutUrl);
      });

      it('should handle session destroy errors', async () => {
        const mockLogoutUrl = 'http://test-issuer/logout';
        (buildEndSessionUrl as jest.Mock).mockReturnValue({ href: mockLogoutUrl });

        mockRequest.session = createMockSession({
          user: {
            idToken: 'test-id-token',
          },
          destroy: jest.fn().mockImplementation(function (callback) {
            callback(new Error('Destroy failed'));
          }),
        });

        oidcModule.enableFor(mockApp);
        const logoutHandler = (mockApp.get as jest.Mock).mock.calls[2][1];
        await logoutHandler(mockRequest, mockResponse, mockNext);

        expect(mockResponse.redirect).toHaveBeenCalledWith(mockLogoutUrl);
      });

      it('should handle logout when no user in session', async () => {
        const mockLogoutUrl = 'http://test-issuer/logout';
        (buildEndSessionUrl as jest.Mock).mockReturnValue({ href: mockLogoutUrl });

        mockRequest.session = createMockSession({
          destroy: jest.fn().mockImplementation(function (callback) {
            callback(null);
          }),
        });

        oidcModule.enableFor(mockApp);
        const logoutHandler = (mockApp.get as jest.Mock).mock.calls[2][1];
        await logoutHandler(mockRequest, mockResponse, mockNext);

        expect(buildEndSessionUrl).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            post_logout_redirect_uri: 'http://localhost:3000',
            id_token_hint: undefined,
          })
        );
        expect(mockResponse.redirect).toHaveBeenCalledWith(mockLogoutUrl);
      });
    });
  });
});
