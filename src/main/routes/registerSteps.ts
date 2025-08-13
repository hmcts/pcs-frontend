import { Application } from 'express';
import { Logger } from '@hmcts/nodejs-logging';

import { ccdCaseMiddleware, oidcMiddleware } from '../middleware';
import { protectedSteps, stepsWithContent } from '../steps';
import { getValidatedLanguage } from '../utils/getValidatedLanguage';

const logger = Logger.getLogger('registerSteps');

export default function registerSteps(app: Application): void {
  for (const step of stepsWithContent) {
    const isProtected = protectedSteps.includes(step);
    const middlewares = isProtected ? [oidcMiddleware, ccdCaseMiddleware] : [];
    const allGetMiddleware = step.middleware ? [...middlewares, ...step.middleware] : middlewares;

    if (step.getController) {
      app.get(step.url, ...allGetMiddleware, (req, res) => {
        const lang = getValidatedLanguage(req);

        logger.debug('Language information', {
          url: req.url,
          step: step.name,
          validatedLang: lang,
          reqLanguage: req.language,
          langCookie: req.cookies?.lang,
          langQuery: req.query?.lang,
          headers: {
            'accept-language': req.headers?.['accept-language'] || undefined,
          },
        });

        const controller = typeof step.getController === 'function' ? step.getController(lang) : step.getController;
        return controller.get(req, res);
      });
    }

    if (step.postController?.post) {
      app.post(step.url, ...middlewares, step.postController.post);
    }
  }

  logger.info('Steps registered successfully', {
    totalSteps: stepsWithContent.length,
    protectedSteps: protectedSteps.length,
  });
}
