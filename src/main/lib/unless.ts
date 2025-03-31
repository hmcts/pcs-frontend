import { NextFunction, Request, Response } from 'express';

type MiddlewareFunction = (req: Request, res: Response, next: NextFunction) => void;

/**
 * Creates a middleware that skips execution for specified paths
 * @param paths Array of paths to exclude from middleware execution
 * @param middleware The middleware function to skip for specified paths
 * @returns A middleware function that implements the unless logic
 */
export function unless(paths: string[], middleware: MiddlewareFunction): MiddlewareFunction {
  return function (req: Request, res: Response, next: NextFunction) {
    // Check if the current path matches any of the excluded paths
    const shouldSkip = paths.some(path => {
      // Convert URL pattern to regex and test against request path
      const regexPath = new RegExp(`^${path.replace(/\*/g, '.*')}$`);
      return regexPath.test(req.path);
    });

    // Skip middleware if path matches, otherwise execute it
    if (shouldSkip) {
      return next();
    }

    return middleware(req, res, next);
  };
}
