import { Application } from 'express';

import { stepsWithContent } from '../steps';
import { oidcMiddleware } from 'middleware/oidc';

export default function registerSteps(app: Application): void {
  for (const step of stepsWithContent) {
    // const isProtected = protectedSteps.includes(step);
    const isProtected = false;
    const middlewares = isProtected ? [oidcMiddleware] : [];

    if (step.getController) {
      app.get(step.url, ...middlewares, step.getController.get);
    }
    if (step.postController?.post) {
      app.post(step.url, ...middlewares, step.postController.post);
    }
  }
}
