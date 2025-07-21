import { Application } from 'express';

import { ccdCaseMiddleware, oidcMiddleware } from '../middleware';
import { protectedSteps, stepsWithContent } from '../steps';

export default function registerSteps(app: Application): void {
  for (const step of stepsWithContent) {
    const isProtected = protectedSteps.includes(step);
    const middlewares = isProtected ? [oidcMiddleware, ccdCaseMiddleware] : [];

    const allGetMiddleware = step.middleware ? [...middlewares, ...step.middleware] : middlewares;

    if (step.getController) {
      app.get(step.url, ...allGetMiddleware, (req, res) => {
        const lang = (req.query.lang as string) || 'en';
        const controller = typeof step.getController === 'function' ? step.getController(lang) : step.getController;
        return controller.get(req, res);
      });
    }

    if (step.postController?.post) {
      app.post(step.url, ...middlewares, step.postController.post);
    }

    app.get('/lang-debug', (req, res) => {
      res.send(`req.language = ${req.language}, lang cookie = ${req.cookies.lang}`);
    });
  }
}
