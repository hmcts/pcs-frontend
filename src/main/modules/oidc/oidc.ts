import { Logger } from '@hmcts/nodejs-logging';
import config from 'config';
import { Express, NextFunction, Request, Response } from 'express';
import * as client from 'openid-client';

import { OIDCConfig } from './config.interface';
import { OIDCAuthenticationError, OIDCCallbackError } from './errors';
export class OIDCModule {
  private config!: client.Configuration;
  private oidcConfig!: OIDCConfig;
  private logger = Logger.getLogger('oidc');
  constructor() {
    this.setupClient();
  }

  private async setupClient(): Promise<void> {
    this.oidcConfig = config.get('oidc') as OIDCConfig;
    this.logger.info('setting up client');
    this.config = await client.discovery(
      new URL(this.oidcConfig.issuer),
      this.oidcConfig.clientId,
      config.get('secrets.pcs.pcs-frontend-idam-secret')
    );

    // Log the configuration for debugging
    this.logger.info('OIDC Configuration:', {
      issuer: this.oidcConfig.issuer,
      clientId: this.oidcConfig.clientId,
      redirectUri: this.oidcConfig.redirectUri,
      scope: this.oidcConfig.scope,
    });
  }

  public enableFor(app: Express): void {
    // Store code verifier in session
    app.use((req: Request, res: Response, next: NextFunction) => {
      // Only generate code verifier for non-callback routes
      if (!req.path.startsWith('/oauth2/callback') && !req.session.codeVerifier) {
        req.session.codeVerifier = client.randomPKCECodeVerifier();
      }
      next();
    });

    // Login route
    app.get('/login', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const codeVerifier = req.session.codeVerifier;
        if (!codeVerifier) {
          throw new OIDCAuthenticationError('No code verifier found in session');
        }
        const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
        const parameters: Record<string, string> = {
          redirect_uri: this.oidcConfig.redirectUri,
          scope: this.oidcConfig.scope,
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
        };

        // Log the authorization request details
        this.logger.info('Authorization request details:', {
          codeVerifier,
          codeChallenge,
          redirectUri: this.oidcConfig.redirectUri,
          scope: this.oidcConfig.scope,
        });

        // check if the AS supports PKCE
        /**
         * We cannot be sure the AS supports PKCE so we're going to use nonce too. Use
         * of PKCE is backwards compatible even if the AS doesn't support it which is
         * why we're using it regardless.
         */
        if (!this.config.serverMetadata().supportsPKCE()) {
          const nonce = client.randomNonce();
          parameters.nonce = nonce;
        }

        this.logger.info('building authorization url');
        const redirectTo = client.buildAuthorizationUrl(this.config, parameters);
        this.logger.info('redirecting to', redirectTo.href);
        res.redirect(redirectTo.href);
      } catch (error) {
        this.logger.error('error building authorization url', error);
        next(new OIDCAuthenticationError('Failed to initiate authentication'));
      }
    });

    // Callback route
    app.get('/oauth2/callback', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const codeVerifier = req.session.codeVerifier;
        if (!codeVerifier) {
          throw new OIDCCallbackError('No code verifier found in session');
        }

        // Add debug logging
        this.logger.info('Processing callback with code verifier');
        this.logger.info('Callback URL:', req.url);
        this.logger.info('Redirect URI:', this.oidcConfig.redirectUri);
        this.logger.info('Code verifier from session:', codeVerifier);

        // Extract just the query string from the request URL
        const queryString = req.url.split('?')[1];
        const callbackUrl = new URL(`?${queryString}`, this.oidcConfig.redirectUri);
        this.logger.info('Full callback URL:', callbackUrl.toString());

        try {
          // Log the token request details
          this.logger.info('Token request details:', {
            codeVerifier,
            redirectUri: callbackUrl.toString(),
            clientId: this.oidcConfig.clientId,
            issuer: this.oidcConfig.issuer,
          });

          const tokens = await client.authorizationCodeGrant(this.config, callbackUrl, {
            pkceCodeVerifier: codeVerifier,
          });

          // Log successful token claims
          this.logger.info('Token claims:', tokens.claims());

          req.session.tokens = tokens;
          req.session.user = tokens.claims();
          res.redirect('/');
        } catch (tokenError: unknown) {
          const error = tokenError as Error & {
            response?: { body?: unknown; status?: number; headers?: unknown };
            code?: string;
          };
          // Log the full error response
          this.logger.error('Token exchange error details:', {
            error: error.message,
            code: error.code,
            name: error.name,
            response: error.response?.body,
            status: error.response?.status,
            headers: error.response?.headers,
          });
          throw error;
        }
      } catch (error) {
        // Enhance error logging
        this.logger.error('Authentication error details:', {
          error: error.message,
          code: error.code,
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
      req.session.destroy(() => {
        res.redirect('/');
      });
    });
  }
}
