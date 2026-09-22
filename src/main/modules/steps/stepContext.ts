import type { RequestHandler } from 'express';

export interface StepContext {
  name: string;
  journey: string;
}

export const withStepContext =
  (ctx: StepContext): RequestHandler =>
  (_req, res, next) => {
    res.locals.step = ctx;
    next();
  };
