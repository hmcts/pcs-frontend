import config from 'config';
import { Express, NextFunction, Request, Response } from 'express';
import * as client from 'openid-client';

import { unless } from '../../lib/unless';

import { OIDCConfig } from './config.interface';
import { OIDCAuthenticationError, OIDCCallbackError } from './errors';
export class OIDCModule {
  private config!: client.Configuration;
  private oidcConfig!: OIDCConfig;

  constructor() {
    this.setupClient();
  }

  private async setupClient(): Promise<void> {
    this.oidcConfig = config.get('oidc') as OIDCConfig;
    this.config = await client.discovery(
      new URL(this.oidcConfig.issuer),
      this.oidcConfig.clientId,
      config.get('secrets.pcs.pcs-frontend-idam-secret')
    );
  }

  public enableFor(app: Express): void {
    // Store code verifier in session
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (!req.session.codeVerifier) {
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
        const redirectTo = client.buildAuthorizationUrl(this.config, parameters);
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
        const tokens = await client.authorizationCodeGrant(this.config, new URL(req.url, this.oidcConfig.redirectUri), {
          pkceCodeVerifier: codeVerifier,
        });

        // Store tokens in session
        req.session.tokens = tokens;
        req.session.user = tokens.claims();

        res.redirect('/');
      } catch (error) {
        next(new OIDCCallbackError('Failed to complete authentication'));
      }
    });

    // Logout route
    app.get('/logout', (req: Request, res: Response) => {
      req.session.destroy(() => {
        res.redirect('/');
      });
    });

    // Authentication middleware
    app.use(
      unless(
        ['/login', '/oauth2/callback', '/logout', '/health/liveness', '/health/readiness'],
        (req: Request, res: Response, next: NextFunction) => {
          if (req.session.user) {
            return next();
          }
          res.redirect('/login');
        }
      )
    );
  }
}
