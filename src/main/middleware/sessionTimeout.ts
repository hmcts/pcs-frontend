import type { NextFunction, Request, Response } from 'express';

/**
 * middleware to make session timeout config and all res.locals available to templates
 */
export const sessionTimeoutMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // copy sessionTimeout from app.locals to res.locals
  if (req.app.locals.sessionTimeout) {
    res.locals.sessionTimeout = req.app.locals.sessionTimeout;
  }

  // res.render to include res.locals in all renders
  const originalRender = res.render.bind(res);
  res.render = function (view: string, options?: object, callback?: (err: Error, html: string) => void) {
    const mergedOptions = { ...res.locals, ...options };
    return originalRender(view, mergedOptions, callback);
  };

  next();
};
