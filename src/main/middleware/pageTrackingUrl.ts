import { NextFunction, Request, Response } from 'express';

const getPageTrackingUrl = (path: string): string => {
  const segments = path.split('/').filter(Boolean);

  if (segments[0] === 'dashboard') {
    return 'dashboard';
  }

  if (segments[0] === 'case' && segments.length > 2) {
    return `${segments.slice(2).join('/')}`;
  }

  return path;
};

export const pageTrackingUrlMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const pageTrackingUrl = getPageTrackingUrl(req.path);
  res.locals.pageTrackingUrl = pageTrackingUrl;
  next();
};
