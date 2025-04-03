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

    // Create client with specific configuration
    const issuer = new URL(this.oidcConfig.issuer);
    const clientId = this.oidcConfig.clientId;
    const clientSecret = config.get('secrets.pcs.pcs-frontend-idam-secret') as string;

    // Log the configuration for debugging
    this.logger.info('OIDC Configuration:', JSON.stringify(this.oidcConfig, null, 2));

    // Create client with specific configuration
    this.config = await client.discovery(issuer, clientId, clientSecret);

    // Log the client configuration
    this.logger.info(
      'Client configuration:',
      JSON.stringify(this.config, null, 2),
      this.config.serverMetadata().token_endpoint
    );
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

        // Always use nonce with HMCTS IDAM
        const nonce = client.randomNonce();
        parameters.nonce = nonce;
        req.session.nonce = nonce; // Store nonce in session

        // Log the authorization request details
        this.logger.info('Authorization request details:', {
          codeVerifier,
          codeChallenge,
          nonce,
          redirectUri: this.oidcConfig.redirectUri,
          scope: this.oidcConfig.scope,
        });

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

        // Use the full URL from the request
        const callbackUrl = new URL(req.url, `https://${req.get('host')}`);
        this.logger.info('Full callback URL:', callbackUrl.toString());

        try {
          // Log the token request details
          this.logger.info('Token request details:', {
            codeVerifier,
            redirectUri: callbackUrl.toString(),
            clientId: this.oidcConfig.clientId,
            issuer: this.oidcConfig.issuer,
          });

          // Get the authorization code from the callback URL
          const code = callbackUrl.searchParams.get('code');
          if (!code) {
            throw new OIDCCallbackError('No authorization code found in callback');
          }

          const body = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: this.oidcConfig.redirectUri,
            client_id: this.oidcConfig.clientId,
            code_verifier: codeVerifier,
            client_secret: config.get('secrets.pcs.pcs-frontend-idam-secret'),
          });

          this.logger.info('fetching token from', this.config.serverMetadata().token_endpoint!);
          this.logger.info('Token request body:', body.toString());

          // Make the token request manually
          const tokenResponse = await fetch(this.config.serverMetadata().token_endpoint!, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body,
          });

          if (!tokenResponse.ok) {
            const errorBody = await tokenResponse.text();
            this.logger.error('Token response error:', {
              status: tokenResponse.status,
              body: errorBody,
            });
            throw new OIDCCallbackError('Failed to exchange authorization code for tokens');
          }

          const tokens = await tokenResponse.json();
          this.logger.info('Token response:', tokens);

          req.session.tokens = tokens;
          req.session.user = tokens;
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
