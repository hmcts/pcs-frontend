/// <reference types="jest" />
import axios from 'axios';
import config from 'config';
import { Express, NextFunction, Request, Response } from 'express';
import * as client from 'openid-client';

import { OIDCAuthenticationError, OIDCCallbackError } from '../../../../main/modules/oidc/errors';
import { OIDCModule } from '../../../../main/modules/oidc/oidc';

jest.mock('axios');
jest.mock('config');
jest.mock('openid-client');
jest.mock('@hmcts/nodejs-logging', () => ({
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
    // CustomSessionData properties
    codeVerifier: undefined,
    nonce: undefined,
    state: undefined,
    tokens: undefined,
    user: undefined,
    serviceToken: undefined,
    ...overrides,
  });

  beforeEach(() => {
    // Mock successful client setup
    const mockMetadata = {
      issuer: 'http://test-issuer',
      token_endpoint: 'http://test-issuer/token',
    };

    (axios.get as jest.Mock).mockResolvedValue({ data: mockMetadata });
    (client.Configuration as jest.Mock).mockImplementation(() => ({
      serverMetadata: () => mockMetadata,
    }));

    // Mock config
    (config.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'oidc') {
        return {
          issuer: 'http://test-issuer',
          clientId: 'test-client-id',
          redirectUri: 'http://localhost:3000/oauth2/callback',
          scope: 'openid profile',
          iss: 'http://test-issuer',
        };
      }
      if (key === 'secrets.pcs.pcs-frontend-idam-secret') {
        return 'test-secret';
      }
      return undefined;
    });

    oidcModule = new OIDCModule();
    mockApp = {
      get: jest.fn(),
      set: jest.fn(),
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

  describe('setupClient', () => {
    it('should successfully setup the OIDC client', async () => {
      const mockMetadata = {
        issuer: 'http://test-issuer',
        token_endpoint: 'http://test-issuer/token',
      };

      (axios.get as jest.Mock).mockResolvedValue({ data: mockMetadata });
      (client.Configuration as jest.Mock).mockImplementation(() => ({
        serverMetadata: () => mockMetadata,
      }));

      await oidcModule['setupClient']();

      expect(axios.get).toHaveBeenCalledWith('http://test-issuer/o/.well-known/openid-configuration');
      expect(client.Configuration).toHaveBeenCalled();
    });

    it('should throw OIDCAuthenticationError when setup fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(oidcModule['setupClient']()).rejects.toThrow(OIDCAuthenticationError);
    });
  });

  describe('enableFor', () => {
    beforeEach(() => {
      // Mock successful client setup
      const mockMetadata = {
        issuer: 'http://test-issuer',
        token_endpoint: 'http://test-issuer/token',
      };

      (axios.get as jest.Mock).mockResolvedValue({ data: mockMetadata });
      (client.Configuration as jest.Mock).mockImplementation(() => ({
        serverMetadata: () => mockMetadata,
      }));
    });

    it('should set trust proxy to true', () => {
      oidcModule.enableFor(mockApp);
      expect(mockApp.set).toHaveBeenCalledWith('trust proxy', true);
    });

    describe('login route', () => {
      it('should redirect to authorization URL', async () => {
        const mockAuthUrl = 'http://test-issuer/auth';
        (client.buildAuthorizationUrl as jest.Mock).mockReturnValue({ href: mockAuthUrl });
        (client.randomPKCECodeVerifier as jest.Mock).mockReturnValue('test-verifier');
        (client.randomNonce as jest.Mock).mockReturnValue('test-nonce');
        (client.randomState as jest.Mock).mockReturnValue('test-state');
        (client.calculatePKCECodeChallenge as jest.Mock).mockResolvedValue('test-challenge');

        oidcModule.enableFor(mockApp);
        const loginHandler = (mockApp.get as jest.Mock).mock.calls[0][1];
        await loginHandler(mockRequest, mockResponse, mockNext);

        expect(mockResponse.redirect).toHaveBeenCalledWith(mockAuthUrl);
        expect(mockRequest.session).toHaveProperty('codeVerifier', 'test-verifier');
        expect(mockRequest.session).toHaveProperty('nonce', 'test-nonce');
        expect(mockRequest.session).toHaveProperty('state', 'test-state');
      });

      it('should handle login errors', async () => {
        (client.randomPKCECodeVerifier as jest.Mock).mockImplementation(() => {
          throw new Error('Random generation failed');
        });

        oidcModule.enableFor(mockApp);
        const loginHandler = (mockApp.get as jest.Mock).mock.calls[0][1];
        await loginHandler(mockRequest, mockResponse, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(OIDCAuthenticationError));
      });
    });

    describe('callback route', () => {
      it('should handle successful authentication', async () => {
        const mockTokens = { access_token: 'test-token', id_token: 'test-id-token' };
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockTokens),
        });

        mockRequest.session = createMockSession({
          codeVerifier: 'test-verifier',
          nonce: 'test-nonce',
        });

        oidcModule.enableFor(mockApp);
        const callbackHandler = (mockApp.get as jest.Mock).mock.calls[1][1];
        await callbackHandler(mockRequest, mockResponse, mockNext);

        expect(mockRequest.session).toHaveProperty('tokens', mockTokens);
        expect(mockRequest.session).toHaveProperty('user', mockTokens);
        expect(mockRequest.session).not.toHaveProperty('codeVerifier');
        expect(mockRequest.session).not.toHaveProperty('nonce');
        expect(mockResponse.redirect).toHaveBeenCalledWith('/');
      });

      it('should handle missing code verifier', async () => {
        mockRequest.session = createMockSession();

        oidcModule.enableFor(mockApp);
        const callbackHandler = (mockApp.get as jest.Mock).mock.calls[1][1];
        await callbackHandler(mockRequest, mockResponse, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(OIDCCallbackError));
      });

      it('should handle token exchange errors with detailed error information', async () => {
        mockRequest.session = createMockSession({
          codeVerifier: 'test-verifier',
          nonce: 'test-nonce',
        });

        global.fetch = jest.fn().mockResolvedValue({
          ok: false,
          status: 400,
          text: () => Promise.resolve('Invalid request'),
          headers: { 'content-type': 'application/json' },
        });

        oidcModule.enableFor(mockApp);
        const callbackHandler = (mockApp.get as jest.Mock).mock.calls[1][1];
        await callbackHandler(mockRequest, mockResponse, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(OIDCCallbackError));
        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Failed to complete authentication',
          })
        );
      });

      it('should handle token exchange errors with network failures', async () => {
        mockRequest.session = createMockSession({
          codeVerifier: 'test-verifier',
          nonce: 'test-nonce',
        });

        global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

        oidcModule.enableFor(mockApp);
        const callbackHandler = (mockApp.get as jest.Mock).mock.calls[1][1];
        await callbackHandler(mockRequest, mockResponse, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(OIDCCallbackError));
        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Failed to complete authentication',
          })
        );
      });
    });

    describe('logout route', () => {
      it('should destroy session and redirect to home', () => {
        const mockDestroy = jest.fn(callback => callback(null));
        mockRequest.session = createMockSession({
          destroy: mockDestroy,
        });

        oidcModule.enableFor(mockApp);
        const logoutHandler = (mockApp.get as jest.Mock).mock.calls[2][1];
        logoutHandler(mockRequest, mockResponse);

        expect(mockDestroy).toHaveBeenCalled();
        expect(mockResponse.redirect).toHaveBeenCalledWith('/');
      });

      it('should handle session destruction errors with detailed logging', () => {
        const mockDestroy = jest.fn(callback => callback(new Error('Destroy failed')));
        mockRequest.session = createMockSession({
          destroy: mockDestroy,
        });

        oidcModule.enableFor(mockApp);
        const logoutHandler = (mockApp.get as jest.Mock).mock.calls[2][1];
        logoutHandler(mockRequest, mockResponse);

        expect(mockDestroy).toHaveBeenCalled();
        expect(mockResponse.redirect).toHaveBeenCalledWith('/');
      });

      it('should handle session destruction with null error', () => {
        const mockDestroy = jest.fn(callback => callback(null));
        mockRequest.session = createMockSession({
          destroy: mockDestroy,
        });

        oidcModule.enableFor(mockApp);
        const logoutHandler = (mockApp.get as jest.Mock).mock.calls[2][1];
        logoutHandler(mockRequest, mockResponse);

        expect(mockDestroy).toHaveBeenCalled();
        expect(mockResponse.redirect).toHaveBeenCalledWith('/');
      });
    });
  });
});
