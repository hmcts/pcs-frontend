import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { isJudgeUser } from '../steps/utils';

export const judgeAccessMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  if (isJudgeUser(req)) {
    return next();
  }

  res.status(404).send('Not Found');
};
