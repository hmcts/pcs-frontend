import { Logger } from '@hmcts/nodejs-logging';
import type { Request } from 'express';
import { Application } from 'express';

import { stepRegistry } from '../app/utils/stepRegistry';
import { ccdCaseMiddleware, oidcMiddleware } from '../middleware';
import { protectedSteps, stepsWithContent } from '../steps';
import { getLanguageFromRequest } from '../utils/getLanguageFromRequest';

const logger = Logger.getLogger('registerSteps');

export default function registerSteps(app: Application): void {
  // Register all steps in the registry FIRST
  for (const step of stepsWithContent) {
    stepRegistry.registerStep(step);
  }

  // Then register routes as before
  for (const step of stepsWithContent) {
    const isProtected = protectedSteps.includes(step);
    const middlewares = isProtected ? [oidcMiddleware, ccdCaseMiddleware] : [];
    const allGetMiddleware = step.middleware ? [...middlewares, ...step.middleware] : middlewares;

    if (step.getController) {
      app.get(step.url, ...allGetMiddleware, (req, res) => {
        // Use i18next-http-middleware's req.language instead of manual validation
        const lang = getLanguageFromRequest(req);

        logger.debug('Language information', {
          url: req.url,
          step: step.name,
          validatedLang: lang,
          reqLanguage: (req as Request & { language?: string }).language,
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
