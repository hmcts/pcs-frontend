import { Logger } from '@hmcts/nodejs-logging';
import config from 'config';
import { Express, NextFunction, Request, Response } from 'express';
import * as jose from 'jose';
import type { Configuration, TokenEndpointResponse, UserInfoResponse } from 'openid-client';
import * as client from 'openid-client';

import type { OIDCConfig } from './config.interface';
import { OIDCAuthenticationError, OIDCCallbackError } from './errors';

export interface RefreshTokenResult {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  accessTokenExp?: number;
}

export class OIDCModule {
  private clientConfig!: Configuration;
  private clientConfigPromise: Promise<Configuration> | null = null;
  private oidcConfig: OIDCConfig = config.get<OIDCConfig>('oidc');
  private readonly logger = Logger.getLogger('oidc');

  constructor() {
    this.setupClient();
  }

  private async setupClient(): Promise<Configuration> {
    if (this.clientConfigPromise) {
      return this.clientConfigPromise;
    }

    this.clientConfigPromise = (async () => {
      this.logger.info('setting up client');

      try {
        const issuer = new URL(this.oidcConfig.issuer);

        this.logger.info('Fetching OIDC configuration from:', this.oidcConfig.issuer);

        // Create client with the actual issuer
        const clientId = this.oidcConfig.clientId;
        const clientSecret = config.get<string>('secrets.pcs.pcs-frontend-idam-secret');

        // Create the client configuration with the server discovery
        this.clientConfig = await client.discovery(issuer, clientId, clientSecret);
        return this.clientConfig;
      } catch (error) {
        this.logger.error('Failed to setup OIDC client:', error);
        this.clientConfigPromise = null;
        throw new OIDCAuthenticationError('Failed to initialize OIDC client');
      }
    })();

    return this.clientConfigPromise;
  }

  private async ensureClientConfig(): Promise<Configuration> {
    if (this.clientConfig) {
      return this.clientConfig;
    }
    return this.setupClient();
  }

  public static getCurrentUrl(req: Request): URL {
    const protocol = req.protocol;
    const host = req.get('host');
    // Get the original URL from the request and preserve the query parameters
    const originalUrl = req.originalUrl;
    return new URL(originalUrl, `${protocol}://${host}`);
  }

  public async refreshUserTokens(refreshToken: string): Promise<RefreshTokenResult> {
    try {
      const clientConfig = await this.ensureClientConfig();
      const tokens: TokenEndpointResponse = await client.refreshTokenGrant(clientConfig, refreshToken);

      const { access_token, id_token, refresh_token } = tokens;

      // Decode access token to get expiry
      let accessTokenExp: number | undefined;
      try {
        const decoded = jose.decodeJwt(access_token);
        if (decoded.exp) {
          accessTokenExp = decoded.exp;
        }
      } catch (error) {
        this.logger.warn('Failed to decode access token for expiry:', error);
      }

      const result: RefreshTokenResult = {
        accessToken: access_token,
        accessTokenExp,
      };

      if (refresh_token) {
        result.refreshToken = refresh_token as string;
      }

      if (id_token) {
        result.idToken = id_token as string;
      }

      return result;
    } catch (error) {
      this.logger.error('Token refresh failed:', {
        error: error instanceof Error ? error.message : String(error),
        code: (error as { code?: string }).code,
        name: (error as { name?: string }).name,
      });
      throw new OIDCAuthenticationError('Failed to refresh access token');
    }
  }

  public enableFor(app: Express): void {
    // Store OIDC module instance in app.locals for middleware access
    app.locals.oidc = this;

    app.set('trust proxy', true);

    app.use(async (req: Request, res: Response, next: NextFunction) => {
      try {
        await this.ensureClientConfig();
      } catch (error) {
        return next(error);
      }
      next();
    });

    // Login route
    app.get('/login', async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Generate a new code verifier and store it in the session
        req.session.codeVerifier = client.randomPKCECodeVerifier();
        const codeChallenge = await client.calculatePKCECodeChallenge(req.session.codeVerifier);

        const parameters: Record<string, string> = {
          redirect_uri: this.oidcConfig.redirectUri,
          scope: this.oidcConfig.scope,
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
        };

        if (!this.clientConfig.serverMetadata().supportsPKCE()) {
          req.session.nonce = client.randomNonce();
          parameters.nonce = req.session.nonce;
        }

        const redirectTo = client.buildAuthorizationUrl(this.clientConfig, parameters);
        res.redirect(redirectTo.href);
      } catch (error) {
        this.logger.error('Login error:', error);
        next(new OIDCAuthenticationError('Failed to initiate authentication'));
      }
    });

    // Callback route
    app.get('/oauth2/callback', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { codeVerifier, nonce } = req.session;

        const callbackUrl = OIDCModule.getCurrentUrl(req);

        const tokens: TokenEndpointResponse = await client.authorizationCodeGrant(this.clientConfig, callbackUrl, {
          pkceCodeVerifier: codeVerifier,
          expectedNonce: nonce,
          idTokenExpected: true,
        });

        const { access_token, id_token, refresh_token } = tokens;

        // @ts-expect-error - claims is not typed
        const claims = tokens.claims();

        const { sub } = claims;
        const user: UserInfoResponse = await client.fetchUserInfo(this.clientConfig, access_token, sub);

        req.session.user = {
          accessToken: access_token,
          idToken: id_token as string,
          refreshToken: refresh_token as string,
          ...user,
        };

        req.session.save(() => {
          delete req.session.codeVerifier;
          delete req.session.nonce;

          const returnTo = req.session.returnTo || '/';
          delete req.session.returnTo;
          res.redirect(returnTo);
        });
      } catch (error) {
        if (error.error_description) {
          this.logger.error(`Authentication failed: ${error.error_description}`);
        }

        this.logger.error('Authentication error details:', {
          description: error.error_description || 'Authentication error details',
          error: error.message,
          code: error.code,
          status: error.status,
          name: error.name,
          stack: error.stack,
          url: req.url,
          redirectUri: this.oidcConfig.redirectUri,
          issuer: this.oidcConfig.issuer,
          clientId: this.oidcConfig.clientId,
        });
        next(new OIDCCallbackError('Failed to complete authentication'));
      }
    });

    // Logout route
    app.get('/logout', (req: Request, res: Response) => {
      // build the logout url
      const callbackUrl = OIDCModule.getCurrentUrl(req);
      const logoutUrl = client.buildEndSessionUrl(this.clientConfig, {
        post_logout_redirect_uri: callbackUrl.origin,
        id_token_hint: req.session.user?.idToken as string,
      });

      req.session.destroy((err: unknown) => {
        if (err) {
          this.logger.error('Session destroyed error:', err);
        }
        res.redirect(logoutUrl.href);
      });
    });
  }
}
