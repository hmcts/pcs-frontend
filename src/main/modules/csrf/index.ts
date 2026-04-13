import { csrfSync } from 'csrf-sync';
import { Express, NextFunction, Request, RequestHandler, Response } from 'express';

import { Logger } from '@modules/logger';

export class Csrf {
  logger = Logger.getLogger('csrf');
  enableFor(app: Express): void {
    this.logger.info('Enabling CSRF protection');
    const { csrfSynchronisedProtection }: { csrfSynchronisedProtection: RequestHandler } = csrfSync({
      /**
       * Extracts the CSRF token from the request body.
       *
       * @param {Request} req - The incoming request object.
       * @returns {string|undefined} The CSRF token if present, otherwise undefined.
       */
      getTokenFromRequest: (req: Request) => req.body?._csrf || req.get('x-csrf-token'),
    });

    // Store for route-level use (e.g. after multer parses multipart body)
    app.locals.csrfProtection = csrfSynchronisedProtection;

    /**
     * Middleware to enforce CSRF protection on incoming requests.
     * Multipart requests are skipped here because req.body is not yet parsed;
     * file-upload routes apply CSRF after multer via postMiddleware.
     */
    app.use((req, res, next) => {
      if (req.is('multipart/form-data')) {
        return next();
      }
      return csrfSynchronisedProtection(req, res, next);
    });

    /**
     * Middleware to expose the CSRF token to views.
     * Adds `res.locals.csrfToken`, making it accessible in templates.
     *
     * @param {Request} req - The incoming request object.
     * @param {Response} res - The response object.
     * @param {NextFunction} next - Callback to pass control to the next middleware.
     */
    app.use((req: Request, res: Response, next: NextFunction) => {
      try {
        if (typeof req.csrfToken === 'function') {
          res.locals.csrfToken = req.csrfToken(); // Makes CSRF token available in views
        }
        next();
      } catch (error) {
        this.logger.error('Error getting CSRF token', {
          error: error instanceof Error ? error.message : String(error),
        });
        next(error);
      }
    });
  }
}
