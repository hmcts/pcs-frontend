import { NextFunction, Request, Response } from 'express';

import type { JourneyFlowConfig } from '../../interfaces/stepFlow.interface';
import { flowConfig as respondToClaimFlowConfig } from '../../steps/respond-to-claim/flow.config';

import { Logger } from '@modules/logger';

const logger = Logger.getLogger('stepDependencyCheck');

export async function getNextStep(
  req: Request,
  currentStepName: string,
  flowConfig: JourneyFlowConfig,
  formData: Record<string, unknown>,
  currentStepData: Record<string, unknown> = {}
): Promise<string | null> {
  const stepConfig = flowConfig.steps[currentStepName];

  if (stepConfig?.routes) {
    for (const route of stepConfig.routes) {
      if (!route.condition) {
        return route.nextStep;
      }
      const conditionMet = await route.condition(req, formData, currentStepData);
      if (conditionMet) {
        return route.nextStep;
      }
    }
  }

  if (stepConfig?.defaultNext) {
    return stepConfig.defaultNext;
  }

  const currentIndex = flowConfig.stepOrder.indexOf(currentStepName);
  if (currentIndex >= 0 && currentIndex < flowConfig.stepOrder.length - 1) {
    return flowConfig.stepOrder[currentIndex + 1];
  }

  return null;
}

export async function getPreviousStep(
  req: Request,
  currentStepName: string,
  flowConfig: JourneyFlowConfig,
  formData: Record<string, unknown> = {}
): Promise<string | null> {
  const stepConfig = flowConfig.steps[currentStepName];

  // If step has explicit previousStep configuration, use it
  if (stepConfig?.previousStep) {
    if (typeof stepConfig.previousStep === 'function') {
      return stepConfig.previousStep(req, formData);
    }
    return stepConfig.previousStep;
  }

  // For conditional steps, determine previous step based on actual path taken
  // Check which step could have led to this step
  for (const [stepName, config] of Object.entries(flowConfig.steps)) {
    if (config.routes) {
      for (const route of config.routes) {
        if (route.nextStep === currentStepName) {
          // If route has condition, check if it matches the form data
          // If no condition, this route always leads to current step
          if (!route.condition) {
            return stepName;
          }
          const conditionMet = await route.condition(req, formData, {});
          if (conditionMet) {
            return stepName;
          }
        }
      }
    }
    if (config.defaultNext === currentStepName) {
      return stepName;
    }
  }

  // Fallback to stepOrder array index
  const currentIndex = flowConfig.stepOrder.indexOf(currentStepName);
  if (currentIndex > 0) {
    return flowConfig.stepOrder[currentIndex - 1];
  }
  return null;
}

export function getStepUrl(stepName: string, flowConfig: JourneyFlowConfig, caseReference?: string): string {
  let basePath = flowConfig.basePath || '';

  if (caseReference && basePath.includes(':caseReference')) {
    basePath = basePath.replace(':caseReference', caseReference);
  }

  return `${basePath}/${stepName}`;
}

export function checkStepDependencies(
  stepName: string,
  flowConfig: JourneyFlowConfig,
  formData: Record<string, unknown>
): string | null {
  const stepConfig = flowConfig.steps[stepName];
  if (!stepConfig || !stepConfig.dependencies || stepConfig.dependencies.length === 0) {
    return null;
  }

  for (const dependency of stepConfig.dependencies) {
    if (!formData[dependency]) {
      return dependency;
    }
  }

  return null;
}

export function createStepNavigation(flowConfig: JourneyFlowConfig): {
  getNextStepUrl: (
    req: Request,
    currentStepName: string,
    currentStepData?: Record<string, unknown>
  ) => Promise<string | null>;
  getBackUrl: (req: Request, currentStepName: string) => Promise<string | null>;
  getStepUrl: (stepName: string, caseReference?: string) => string;
} {
  return {
    getNextStepUrl: async (
      req: Request,
      currentStepName: string,
      currentStepData: Record<string, unknown> = {}
    ): Promise<string | null> => {
      const formData = req.session?.formData || {};
      const caseReference = req.res?.locals.validatedCase?.id;
      const nextStep = await getNextStep(req, currentStepName, flowConfig, formData, currentStepData);
      return nextStep ? getStepUrl(nextStep, flowConfig, caseReference) : null;
    },

    getBackUrl: async (req: Request, currentStepName: string): Promise<string | null> => {
      const formData = req.session?.formData || {};
      const caseReference = req.res?.locals.validatedCase?.id;
      const previousStep = await getPreviousStep(req, currentStepName, flowConfig, formData);
      return previousStep ? getStepUrl(previousStep, flowConfig, caseReference) : null;
    },

    getStepUrl: (stepName: string, caseReference?: string): string => {
      return getStepUrl(stepName, flowConfig, caseReference);
    },
  };
}

export const stepNavigation = createStepNavigation(respondToClaimFlowConfig);

export function stepDependencyCheckMiddleware(flowConfig: JourneyFlowConfig = respondToClaimFlowConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const urlParts = req.path.split('/');
    const stepName = urlParts[urlParts.length - 1];

    if (!stepName) {
      return next();
    }

    const formData = req.session?.formData || {};
    const missingDependency = checkStepDependencies(stepName, flowConfig, formData);

    if (missingDependency) {
      logger.debug(`Step ${stepName} has unmet dependency: ${missingDependency}`);
      const dependencyUrl = getStepUrl(missingDependency, flowConfig);
      return res.redirect(303, dependencyUrl);
    }

    next();
  };
}
