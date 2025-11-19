import { Logger } from '@hmcts/nodejs-logging';
import { Application } from 'express';

import { getValidatedLanguage } from '../app/utils/getValidatedLanguage';
import { ccdCaseMiddleware, oidcMiddleware } from '../middleware';
import { stepDependencyCheckMiddleware } from '../middleware/stepDependencyCheck';
import { stepsWithContent } from '../steps';
import { userJourneyFlowConfig } from '../steps/userJourney/flow.config';

const logger = Logger.getLogger('registerSteps');

export default function registerSteps(app: Application): void {
  for (const step of stepsWithContent) {
    // Check if step requires auth from flow configuration
    // Defaults to true if requiresAuth is not specified
    const stepConfig = userJourneyFlowConfig.steps[step.name];
    const requiresAuth = stepConfig?.requiresAuth !== false;
    const middlewares = requiresAuth ? [oidcMiddleware, ccdCaseMiddleware] : [];
    const dependencyCheck = stepDependencyCheckMiddleware();
    const allGetMiddleware = step.middleware
      ? [...middlewares, dependencyCheck, ...step.middleware]
      : [...middlewares, dependencyCheck];

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

        const controller = typeof step.getController === 'function' ? step.getController() : step.getController;
        return controller.get(req, res);
      });
    }

    if (step.postController?.post) {
      app.post(step.url, ...middlewares, step.postController.post);
    }
  }

  const protectedStepsCount = stepsWithContent.filter(step => {
    const stepConfig = userJourneyFlowConfig.steps[step.name];
    // Default to true if requiresAuth is undefined/null
    return stepConfig?.requiresAuth !== false;
  }).length;

  logger.info('Steps registered successfully', {
    totalSteps: stepsWithContent.length,
    protectedSteps: protectedStepsCount,
  });
}
