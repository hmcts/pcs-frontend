import { Application, IRouter, Router } from 'express';
import type { RequestHandler } from 'express';

import type { JourneyFlowConfig } from '../interfaces/stepFlow.interface';
import type { StepDefinition } from '../interfaces/stepFormData.interface';
import { caseReferenceParamMiddleware, oidcMiddleware } from '../middleware';
import { getValidatedLanguage, stepDependencyCheckMiddleware } from '../modules/steps';
import { getJourneyConfig, getStepsForJourney, journeyRegistry, type ResolvedJourneyConfig } from '../steps';

import { Logger } from '@modules/logger';

const logger = Logger.getLogger('registerSteps');

interface StepRegistrationStats {
  totalSteps: number;
  totalProtectedSteps: number;
  journeyProtectedSteps: number;
}

/**
 * Get journeys to register based on specific journey filter
 */
function getJourneysToRegister(specificJourney?: string): [string, ResolvedJourneyConfig][] {
  const journeyNames = specificJourney
    ? Object.keys(journeyRegistry).filter(name => name === specificJourney)
    : Object.keys(journeyRegistry);

  if (specificJourney && journeyNames.length === 0) {
    const availableJourneys = Object.keys(journeyRegistry).join(', ');
    throw new Error(`Journey '${specificJourney}' not found in registry. Available journeys: ${availableJourneys}`);
  }

  return journeyNames.map(name => [name, getJourneyConfig(name)] as [string, ResolvedJourneyConfig]);
}

/**
 * Build GET middleware array for a step
 */
function buildGetMiddleware(
  requiresAuth: boolean,
  journey: ResolvedJourneyConfig,
  flowConfig: JourneyFlowConfig,
  stepMiddleware?: RequestHandler[]
): RequestHandler[] {
  const authMiddlewares = requiresAuth ? [oidcMiddleware] : [];
  const journeyContextMiddleware: RequestHandler = (req, res, next) => {
    res.locals.journeyContext = {
      journeyName: journey.name,
      profile: journey.profile,
      flowConfig,
      translationFolders: journey.translationFolders,
    };

    if (req.session) {
      const sessionWithJourneyData = req.session as typeof req.session & {
        journeyFormData?: Record<string, Record<string, unknown>>;
        formData?: Record<string, unknown>;
      };

      if (!sessionWithJourneyData.journeyFormData) {
        sessionWithJourneyData.journeyFormData = {};
      }

      if (!sessionWithJourneyData.journeyFormData[journey.name]) {
        sessionWithJourneyData.journeyFormData[journey.name] = {};
      }

      sessionWithJourneyData.formData = sessionWithJourneyData.journeyFormData[journey.name];
    }

    next();
  };
  const dependencyCheck = stepDependencyCheckMiddleware(flowConfig);

  return stepMiddleware
    ? [...authMiddlewares, journeyContextMiddleware, dependencyCheck, ...stepMiddleware]
    : [...authMiddlewares, journeyContextMiddleware, dependencyCheck];
}

/**
 * Create GET request handler with language logging
 */
function createGetHandler(step: StepDefinition, journeyName: string): RequestHandler {
  return (req, res) => {
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
  };
}

/**
 * Register routes for a single step
 */
function registerStepRoutes(
  router: IRouter,
  step: StepDefinition,
  journey: ResolvedJourneyConfig,
  flowConfig: JourneyFlowConfig,
  journeyName: string,
  stats: StepRegistrationStats
): void {
  const stepConfig = flowConfig.steps[step.name];
  const requiresAuth = stepConfig?.requiresAuth !== false;
  const postMiddlewares = buildGetMiddleware(requiresAuth, journey, flowConfig);

  if (step.getController) {
    const allGetMiddleware = buildGetMiddleware(requiresAuth, journey, flowConfig, step.middleware);
    router.get(step.url, ...allGetMiddleware, createGetHandler(step, journeyName));
  }

  if (step.postController?.post) {
    router.post(step.url, ...postMiddlewares, step.postController.post);
  }

  stats.totalSteps++;
  if (requiresAuth) {
    stats.journeyProtectedSteps++;
    stats.totalProtectedSteps++;
  }
}

/**
 * Register steps for all journeys or a specific journey
 * @param router - Express Application or Router instance
 * @param specificJourney - Optional journey name to register only that journey
 */
export function registerSteps(router: IRouter, specificJourney?: string): void {
  const stats: StepRegistrationStats = {
    totalSteps: 0,
    totalProtectedSteps: 0,
    journeyProtectedSteps: 0,
  };

  const journeysToRegister = getJourneysToRegister(specificJourney);

  for (const [journeyName, journey] of journeysToRegister) {
    const flowConfig = journey.flowConfig;
    const journeySteps = getStepsForJourney(journeyName);
    stats.journeyProtectedSteps = 0;

    logger.debug(`Registering steps for journey: ${journeyName}`, {
      journeyName,
      stepCount: journeySteps.length,
    });

    for (const step of journeySteps) {
      registerStepRoutes(router, step, journey, flowConfig, journeyName, stats);
    }

    logger.debug(`Journey ${journeyName} registered`, {
      journeyName,
      stepsRegistered: journeySteps.length,
      protectedSteps: stats.journeyProtectedSteps,
    });
  }

  logger.info('Steps registered successfully', {
    totalJourneys: Object.keys(journeyRegistry).length,
    totalSteps: stats.totalSteps,
    totalProtectedSteps: stats.totalProtectedSteps,
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
