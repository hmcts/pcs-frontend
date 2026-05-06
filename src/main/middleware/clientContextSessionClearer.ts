import { NextFunction, Request, Response } from 'express';

const getStepPath = (path: string): string => {
  const segments = path.split('/').filter(Boolean);

  if (segments[0] === 'case' && segments.length > 3) {
    return `${segments.slice(3).join('/')}`;
  }
  return path;
};

export const clientContextSessionClearerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const setpPath = getStepPath(req.path);
  if (setpPath.includes('start-now')) {
    delete req.session.clientContext;
  }
  next();
};
