import * as bodyParser from 'body-parser';
import config from 'config';
import { Express, NextFunction, Request, Response } from 'express';

import type { OIDCConfig } from './config.interface';
import { OIDCAuthenticationError } from './errors';

import { Logger } from '@modules/logger';

/**
 * LOCAL DEVELOPMENT ONLY - Password Grant Flow
 *
 * SECURITY: This file ships to production but is only loaded when OIDC_ISSUER
 * contains "localhost". Production deployments use AAT/Prod IDAM URLs, so this
 * code path is never executed in production.
 */
export class OIDCLocalModule {
  private oidcConfig: OIDCConfig = config.get<OIDCConfig>('oidc');
  private readonly logger = Logger.getLogger('oidc-local');

  public static getCurrentUrl(req: Request): URL {
    const protocol = req.protocol;
    const host = req.get('host');
    const originalUrl = req.originalUrl;
    return new URL(originalUrl, `${protocol}://${host}`);
  }

  public enableFor(app: Express): void {
    this.logger.warn('🔧 LOCAL DEV MODE: Using password grant flow with IDAM simulator');
    app.set('trust proxy', true);

    // Login form
    app.get('/login', (req: Request, res: Response) => {
      if (req.query.returnTo) {
        req.session.returnTo = req.query.returnTo as string;
      }

      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Local Development Login</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 400px; margin: 100px auto; padding: 20px; }
            input { width: 100%; padding: 10px; margin: 10px 0; box-sizing: border-box; }
            button { width: 100%; padding: 12px; background: #1d70b8; color: white; border: none; cursor: pointer; font-size: 16px; }
            button:hover { background: #003078; }
            .info { background: #f3f2f1; padding: 15px; margin-bottom: 20px; border-left: 4px solid #1d70b8; }
            .warning { background: #fff3cd; padding: 15px; margin-bottom: 20px; border-left: 4px solid #ffc107; color: #856404; }
            h2 { color: #0b0c0c; }
          </style>
        </head>
        <body>
          <h2>Local Development Login</h2>
          <div class="warning">
            <strong>⚠️ DEVELOPMENT MODE</strong><br>
            Using password grant flow (not for production)
          </div>
          <div class="info">
            <strong>Test Users:</strong><br>
            • citizen@pcs.com<br>
            • caseworker@pcs.com<br>
            • pcs-solicitor1@test.com<br>
            <strong>Password:</strong> Pa55word11
          </div>
          <form method="POST" action="/login">
            <input type="email" name="username" placeholder="Email" required value="citizen@pcs.com" />
            <input type="password" name="password" placeholder="Password" required value="Pa55word11" />
            <button type="submit">Sign In</button>
          </form>
        </body>
        </html>
      `);
    });

    // Handle login
    app.post(
      '/login',
      bodyParser.urlencoded({ extended: false }),
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { username, password } = req.body;

          if (!username || !password) {
            return res.status(400).send('Username and password required');
          }

          const tokenEndpoint = `${this.oidcConfig.issuer}/token`;
          const clientId = this.oidcConfig.clientId;
          const clientSecret = config.get<string>('secrets.pcs.pcs-frontend-idam-secret');

          const params = new URLSearchParams({
            username,
            password,
            grant_type: 'password',
            client_id: clientId,
            client_secret: clientSecret,
            scope: this.oidcConfig.scope,
          });

          const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
          });

          if (!response.ok) {
            this.logger.error('Token request failed:', response.status, await response.text());
            return res.status(401).send('Invalid credentials');
          }

          const tokens = await response.json();
          const { access_token, id_token, refresh_token } = tokens;

          const userInfoEndpoint = `${this.oidcConfig.issuer}/userinfo`;
          const userInfoResponse = await fetch(userInfoEndpoint, {
            headers: { Authorization: `Bearer ${access_token}` },
          });

          if (!userInfoResponse.ok) {
            this.logger.error('UserInfo request failed:', userInfoResponse.status);
            return res.status(500).send('Failed to get user info');
          }

          const userInfo = await userInfoResponse.json();

          req.session.user = {
            accessToken: access_token,
            idToken: id_token,
            refreshToken: refresh_token,
            ...userInfo,
          };

          this.logger.info(`✅ User authenticated: ${userInfo.email}`);

          req.session.save(() => {
            const returnTo = req.session.returnTo || '/';
            delete req.session.returnTo;
            res.redirect(returnTo);
          });
        } catch (error) {
          this.logger.error('Local login error:', error);
          next(new OIDCAuthenticationError('Failed to authenticate'));
        }
      }
    );

    // Logout
    app.get('/logout', (req: Request, res: Response) => {
      const callbackUrl = OIDCLocalModule.getCurrentUrl(req);
      req.session.destroy((err: unknown) => {
        if (err) {
          this.logger.error('Session destroy error:', err);
        }
        res.redirect(callbackUrl.origin);
      });
    });
  }
}
