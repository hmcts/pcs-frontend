import { Logger } from '@hmcts/nodejs-logging';
import config from 'config';
import { Express, NextFunction, Request, Response } from 'express';
import * as client from 'openid-client';

import { OIDCConfig } from './config.interface';
import { OIDCAuthenticationError, OIDCCallbackError } from './errors';

// Define the claims interface to match what we expect from the IDAM service
interface IDAMClaims {
  roles?: string[];
  authorities?: string[];
  permissions?: string[];
  scope?: string;
  [key: string]: string | string[] | undefined;
}

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
        const nonce = client.randomNonce();

        const parameters: Record<string, string> = {
          redirect_uri: this.oidcConfig.redirectUri,
          scope: this.oidcConfig.scope,
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
          nonce,
        };

        // Store nonce in session
        req.session.nonce = nonce;
        this.logger.info('Generated nonce for session:', nonce);

        const redirectTo = client.buildAuthorizationUrl(this.clientConfig, parameters);
        this.logger.info('redirecting to', redirectTo.href);
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

        try {
          // Log the token request details
          this.logger.info('Token request details:', {
            codeVerifier,
            redirectUri: callbackUrl.toString(),
            clientId: this.oidcConfig.clientId,
            issuer: this.oidcConfig.issuer,
            expectedNonce: nonce,
          });

          // Use the library's authorizationCodeGrant method with explicit nonce validation
          const tokens = await client.authorizationCodeGrant(this.clientConfig, callbackUrl, {
            pkceCodeVerifier: codeVerifier,
            expectedNonce: nonce,
          });

          this.logger.info('Token response received successfully');

          // Process the claims to extract roles
          const claims = (tokens.claims() as IDAMClaims) || {};
          this.logger.info('User claims received:', JSON.stringify(claims, null, 2));

          // Extract roles from various possible claim fields
          // HMCTS IDAM might use different claim names for roles
          let roles: string[] = [];

          // Check for roles in various possible claim fields
          if (claims.roles) {
            roles = Array.isArray(claims.roles) ? claims.roles : [];
            this.logger.info('Found roles in claims.roles:', roles);
          } else if (claims.authorities) {
            roles = Array.isArray(claims.authorities) ? claims.authorities : [];
            this.logger.info('Found roles in claims.authorities:', roles);
          } else if (claims.permissions) {
            roles = Array.isArray(claims.permissions) ? claims.permissions : [];
            this.logger.info('Found roles in claims.permissions:', roles);
          } else if (claims.scope) {
            // Sometimes roles are included in the scope claim
            const scopeRoles = claims.scope.split(' ').filter((s: string) => s.startsWith('fr:idm:'));
            roles = scopeRoles.map((r: string) => r.replace('fr:idm:', ''));
            this.logger.info('Found roles in claims.scope:', roles);
          }

          // Log all available claims for debugging
          this.logger.info('All available claims:', Object.keys(claims));

          // Store tokens and user info in session
          req.session.tokens = tokens;
          req.session.user = {
            ...claims,
            roles,
          };

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
      req.session.destroy(() => {
        res.redirect('/');
      });
    });
  }
}
