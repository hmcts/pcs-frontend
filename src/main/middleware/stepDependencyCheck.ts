import { Logger } from '@hmcts/nodejs-logging';
import { NextFunction, Request, Response } from 'express';

import { checkStepDependencies, getStepUrl } from '../app/utils/stepFlow';
import { userJourneyFlowConfig } from '../steps/userJourney/flow.config';

const logger = Logger.getLogger('stepDependencyCheck');

/**
 * Middleware to check if a step's dependencies are met
 * If dependencies are not met, redirects to the first missing dependency
 */
export function stepDependencyCheckMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Extract step name from URL (e.g., /steps/user-journey/enter-address -> enter-address)
    const urlParts = req.path.split('/');
    const stepName = urlParts[urlParts.length - 1];

    if (!stepName) {
      return next();
    }

    const formData = req.session.formData || {};

    // Check dependencies
    const missingDependency = checkStepDependencies(stepName, userJourneyFlowConfig, formData);
    if (missingDependency) {
      logger.debug(`Step ${stepName} has unmet dependency: ${missingDependency}`);
      const dependencyUrl = getStepUrl(missingDependency, userJourneyFlowConfig);
      return res.redirect(303, dependencyUrl);
    }

    next();
  };
}
