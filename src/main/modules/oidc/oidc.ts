import { Logger } from '@hmcts/nodejs-logging';
import config from 'config';
import { Express, NextFunction, Request, Response } from 'express';
import * as client from 'openid-client';

import { OIDCConfig } from './config.interface';
import { OIDCAuthenticationError, OIDCCallbackError } from './errors';

export class OIDCModule {
  private clientConfig!: client.Configuration;
  private oidcConfig!: OIDCConfig;
  private logger = Logger.getLogger('oidc');

  constructor() {
    this.setupClient();
  }

  private async setupClient(): Promise<void> {
    this.oidcConfig = config.get('oidc') as OIDCConfig;
    this.logger.info('setting up client');

    // Create client with specific configuration
    const issuer = new URL(this.oidcConfig.issuer);
    const clientId = this.oidcConfig.clientId;
    const clientSecret = config.get('secrets.pcs.pcs-frontend-idam-secret') as string;

    // Create client with specific configuration
    this.clientConfig = await client.discovery(issuer, clientId, clientSecret);

    // Log the client configuration
    this.logger.info('Client configuration:', JSON.stringify(this.clientConfig.serverMetadata(), null, 2));
  }

  public enableFor(app: Express): void {
    app.set('trust proxy', true);

    // Login route
    app.get('/login', async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Generate code verifier only when needed for login
        if (!req.session.codeVerifier) {
          req.session.codeVerifier = client.randomPKCECodeVerifier();
        }

        const codeVerifier = req.session.codeVerifier;
        const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
        const parameters: Record<string, string> = {
          redirect_uri: this.oidcConfig.redirectUri,
          scope: this.oidcConfig.scope,
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
          nonce: client.randomNonce(),
        };

        req.session.nonce = parameters.nonce; // Store nonce in session

        const redirectTo = client.buildAuthorizationUrl(this.clientConfig, parameters);
        this.logger.info('redirecting to', redirectTo.href);
        res.redirect(redirectTo.href);
      } catch (error) {
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

        // Get the full URL more reliably
        const protocol = req.protocol;
        const host = req.get('host');
        // Get the original URL from the request and preserve the query parameters
        const originalUrl = req.originalUrl;
        const callbackUrl = new URL(originalUrl, `${protocol}://${host}`);

        try {
          // Log the token request details
          this.logger.info('Token request details:', {
            codeVerifier,
            redirectUri: callbackUrl.toString(),
            clientId: this.oidcConfig.clientId,
            issuer: this.oidcConfig.issuer,
            expectedNonce: req.session.nonce,
          });

          // Use the library's authorizationCodeGrant method with basic options
          const tokens = await client.authorizationCodeGrant(this.clientConfig, callbackUrl, {
            pkceCodeVerifier: codeVerifier,
            expectedNonce: req.session.nonce,
          });

          this.logger.info('Token response:', tokens);

          // Store tokens in session
          req.session.tokens = tokens;
          req.session.user = tokens.claims();
          res.redirect('/');
        } catch (tokenError: unknown) {
          const error = tokenError as Error & {
            response?: { body?: unknown; status?: number; headers?: unknown };
            code?: string;
            cause?: unknown;
          };
          // Log the full error response with more details
          this.logger.error('Token exchange error details:', {
            error: error.message,
            code: error.code,
            name: error.name,
            response: error.response?.body,
            status: error.response?.status,
            headers: error.response?.headers,
            cause: error.cause,
            stack: error.stack,
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
