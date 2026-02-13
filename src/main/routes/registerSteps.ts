import { Logger } from '@hmcts/nodejs-logging';
import { Application, IRouter, Router } from 'express';

import { caseReferenceParamMiddleware, oidcMiddleware } from '../middleware';
import { getValidatedLanguage, stepDependencyCheckMiddleware } from '../modules/steps';
import { getStepsForJourney, journeyRegistry } from '../steps';

const logger = Logger.getLogger('registerSteps');

/**
 * Register steps for all journeys or a specific journey
 * @param router - Express Application or Router instance
 * @param specificJourney - Optional journey name to register only that journey
 */
export function registerSteps(router: IRouter, specificJourney?: string): void {
  let totalSteps = 0;
  let totalProtectedSteps = 0;

  // Iterate over all journeys (or just the specific one if provided)
  const journeysToRegister = specificJourney
    ? Object.entries(journeyRegistry).filter(([name]) => name === specificJourney)
    : Object.entries(journeyRegistry);

  // Validate that the specific journey exists
  if (specificJourney && journeysToRegister.length === 0) {
    const availableJourneys = Object.keys(journeyRegistry).join(', ');
    throw new Error(`Journey '${specificJourney}' not found in registry. Available journeys: ${availableJourneys}`);
  }

  for (const [journeyName, journey] of journeysToRegister) {
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
        router.get(step.url, ...allGetMiddleware, (req, res) => {
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
        router.post(step.url, ...middlewares, step.postController.post);
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

/**
 * Auto-discovers and registers all journeys from the journey registry.
 * Creates a dedicated router for each journey with journey-specific middleware.
 *
 * This prevents the need to manually import and mount each journey router in app.ts.
 * When you add a new journey, just add it to the journeyRegistry and it will be auto-mounted.
 *
 * @param app - Express Application instance
 */
export function registerAllJourneys(app: Application): void {
  logger.info('Auto-registering all journeys from registry');

  for (const [journeyName] of Object.entries(journeyRegistry)) {
    // Create a dedicated router for this journey with param merging enabled
    const journeyRouter = Router({ mergeParams: true });

    // Apply journey-specific middleware
    // Note: Auto-save is handled via formBuilder's beforeRedirect, not middleware
    journeyRouter.param('caseReference', caseReferenceParamMiddleware);

    // Register all steps for this journey on the journey router
    registerSteps(journeyRouter, journeyName);

    // Mount the journey router on the app at root (routes have full paths)
    app.use(journeyRouter);

    logger.info(`Journey '${journeyName}' auto-registered and mounted`);
  }

  logger.info('All journeys registered successfully');
}
