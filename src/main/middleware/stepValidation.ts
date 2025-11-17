import { Logger } from '@hmcts/nodejs-logging';
import type { NextFunction, Request, Response } from 'express';

import { getCompletedSteps } from '../app/utils/navigation';
import { stepRegistry } from '../app/utils/stepRegistry';

const logger = Logger.getLogger('stepValidation');

export function isStepAccessible(stepName: string, completedSteps: string[]): boolean {
  return stepRegistry.arePrerequisitesMet(stepName, completedSteps);
}

export function stepValidationMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const step = stepRegistry.getStepByUrl(req.path);

    if (!step) {
      return next();
    }

    const stepOrder = stepRegistry.getStepOrder();
    if (stepOrder.length > 0 && step.name === stepOrder[0]) {
      return next();
    }

    const completedSteps = getCompletedSteps(req);
    const isAccessible = isStepAccessible(step.name, completedSteps);

    if (!isAccessible) {
      logger.warn('Step access denied due to unmet prerequisites', {
        stepName: step.name,
        stepUrl: step.url,
        prerequisites: step.prerequisites || [],
        completedSteps,
      });

      const firstStep = stepRegistry.getStep(stepOrder[0]);
      if (firstStep) {
        return res.redirect(303, firstStep.url);
      }
    }

    next();
  };
}
