import { Application } from 'express';

import { ccdCaseMiddleware, oidcMiddleware } from '../middleware';
import { protectedSteps, stepsWithContent } from '../steps';

export default function registerSteps(app: Application): void {
  for (const step of stepsWithContent) {
    const isProtected = protectedSteps.includes(step);
    const middlewares = isProtected ? [oidcMiddleware, ccdCaseMiddleware] : [];

    if (step.getController) {
      app.get(step.url, ...middlewares, step.getController.get);
    }
    if (step.postController?.post) {
      app.post(step.url, ...middlewares, step.postController.post);
    }
  }
}
