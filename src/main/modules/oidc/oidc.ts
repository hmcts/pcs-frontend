import { Logger } from '@hmcts/nodejs-logging';
import axios from 'axios';
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

    try {
      // Manually fetch the OIDC configuration
      const discoveryUrl = new URL('o/.well-known/openid-configuration', this.oidcConfig.issuer).toString();
      this.logger.info('Fetching OIDC configuration from:', discoveryUrl);

      const response = await axios.get(discoveryUrl);
      const metadata = response.data;

      // Create client with the actual issuer
      const clientId = this.oidcConfig.clientId;
      const clientSecret = config.get('secrets.pcs.pcs-frontend-idam-secret') as string;

      // Create client with manual configuration
      // Create a server metadata object with the necessary fields
      const serverMetadata = {
        ...metadata,
        issuer: this.oidcConfig.iss,
      };

      // Create the client configuration with the server metadata
      this.clientConfig = new client.Configuration(serverMetadata, clientId, clientSecret);

      this.logger.info(
        'Client configuration created with metadata:',
        JSON.stringify(this.clientConfig.serverMetadata(), null, 2)
      );
    } catch (error) {
      this.logger.error('Failed to setup OIDC client:', error);
      throw new OIDCAuthenticationError('Failed to initialize OIDC client');
    }
  }

  public enableFor(app: Express): void {
    app.set('trust proxy', true);

    // Login route
    app.get('/login', async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Generate a new code verifier and store it in the session
        req.session.codeVerifier = client.randomPKCECodeVerifier();
        req.session.nonce = client.randomNonce();

        const codeChallenge = await client.calculatePKCECodeChallenge(req.session.codeVerifier);

        const parameters: Record<string, string> = {
          redirect_uri: this.oidcConfig.redirectUri,
          scope: this.oidcConfig.scope,
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
          nonce: req.session.nonce,
        };

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
        const codeVerifier = req.session.codeVerifier;
        if (!codeVerifier) {
          throw new OIDCCallbackError('No code verifier found in session');
        }

        const nonce = req.session.nonce;
        if (!nonce) {
          throw new OIDCCallbackError('No nonce found in session');
        }

        // Get the full URL more reliably
        const protocol = req.protocol;
        const host = req.get('host');
        // Get the original URL from the request and preserve the query parameters
        const originalUrl = req.originalUrl;
        const callbackUrl = new URL(originalUrl, `${protocol}://${host}`);

        // Get the authorization code from the callback URL
        const code = callbackUrl.searchParams.get('code');
        if (!code) {
          throw new OIDCCallbackError('No authorization code found in callback');
        }

        try {
          // Use the library's authorizationCodeGrant method with explicit nonce validation
          // TODO: doesn't seem to work with the current config/IDAM setup
          // const tokens = await client.authorizationCodeGrant(this.clientConfig, callbackUrl, {
          //   pkceCodeVerifier: codeVerifier,
          //   expectedNonce: nonce,
          //   idTokenExpected: true,
          // });

          const body = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: this.oidcConfig.redirectUri,
            client_id: this.oidcConfig.clientId,
            code_verifier: codeVerifier,
            client_secret: config.get('secrets.pcs.pcs-frontend-idam-secret'),
          });

          // Make the token request manually
          const tokenResponse = await fetch(this.clientConfig.serverMetadata().token_endpoint!, {
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

          req.session.tokens = tokens;

          // TODO: this is not the correct way to get the user info, we should use the library's fetchUserInfo method
          req.session.user = tokens;

          // Clear sensitive session data after successful authentication
          delete req.session.codeVerifier;
          delete req.session.nonce;

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
      // TODO: destroy the session by calling the IDAM logout endpoint
      req.session.destroy(err => {
        if (err) {
          this.logger.error('Session destroyed error:', err);
        }
        res.redirect('/');
      });
    });
  }
}
