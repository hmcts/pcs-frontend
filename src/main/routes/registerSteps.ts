import { Application } from 'express';

import { oidcMiddleware } from '../middleware';
import { getStepsForJourney, journeyRegistry } from '../steps';

import { Logger } from '@modules/logger';
import { getValidatedLanguage, stepDependencyCheckMiddleware } from '@modules/steps';

const logger = Logger.getLogger('registerSteps');

export default function registerSteps(app: Application): void {
  let totalSteps = 0;
  let totalProtectedSteps = 0;

  // Iterate over all journeys
  for (const [journeyName, journey] of Object.entries(journeyRegistry)) {
    const flowConfig = journey.flowConfig;
    const journeySteps = getStepsForJourney(journeyName);
    let journeyProtectedSteps = 0;

    logger.debug(`Registering steps for journey: ${journeyName}`, {
      journeyName,
      stepCount: journeySteps.length,
    });

    // Register steps for this journey
    for (const step of journeySteps) {
      const stepConfig = flowConfig.steps[step.name];
      const requiresAuth = stepConfig?.requiresAuth !== false;

      const middlewares = requiresAuth ? [oidcMiddleware] : [];

      // Use journey-specific flow config for dependency checking
      const dependencyCheck = stepDependencyCheckMiddleware(flowConfig);

      const allGetMiddleware = step.middleware
        ? [...middlewares, dependencyCheck, ...step.middleware]
        : [...middlewares, dependencyCheck];

      if (step.getController) {
        app.get(step.url, ...allGetMiddleware, (req, res) => {
          const lang = getValidatedLanguage(req);

          logger.debug('Language information', {
            url: req.url,
            step: step.name,
            journey: journeyName,
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

      totalSteps++;
      if (requiresAuth) {
        journeyProtectedSteps++;
        totalProtectedSteps++;
      }
    }

    logger.debug(`Journey ${journeyName} registered`, {
      journeyName,
      stepsRegistered: journeySteps.length,
      protectedSteps: journeyProtectedSteps,
    });
  }

  logger.info('Steps registered successfully', {
    totalJourneys: Object.keys(journeyRegistry).length,
    totalSteps,
    totalProtectedSteps,
  });
}
