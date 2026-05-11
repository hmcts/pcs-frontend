import type { Request, RequestHandler } from 'express';

export interface StepContext {
  name: string;
  journey: string;
}

export function getStepContext(req: Request): StepContext | undefined {
  return req.res?.locals.step;
}

export const withStepContext =
  (ctx: StepContext): RequestHandler =>
  (_req, res, next) => {
    res.locals.step = ctx;
    next();
  };
