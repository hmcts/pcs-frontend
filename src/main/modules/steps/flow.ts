import { NextFunction, Request, Response } from 'express';

import { Logger } from '@modules/logger';
import type { JourneyFlowConfig, JourneyFlowConfigResolver } from '@modules/steps/stepFlow.interface';

const logger = Logger.getLogger('stepDependencyCheck');

async function resolveFlowConfig(
  req: Request,
  flowConfigOrResolver: JourneyFlowConfig | JourneyFlowConfigResolver
): Promise<JourneyFlowConfig> {
  if (typeof flowConfigOrResolver === 'function') {
    return flowConfigOrResolver(req);
  }

  return flowConfigOrResolver;
}

export async function getNextStep(
  req: Request,
  currentStepName: string,
  flowConfig: JourneyFlowConfig,
  formData: Record<string, unknown>,
  currentStepData: Record<string, unknown> = {}
): Promise<string | null> {
  if (flowConfig.useShowConditions) {
    return getNextStepByShowCondition(req, currentStepName, flowConfig);
  } else {
    return getNextStepByRouteConditions(req, currentStepName, flowConfig, formData, currentStepData);
  }
}

async function getNextStepByShowCondition(req: Request, currentStepName: string, flowConfig: JourneyFlowConfig) {
  const currentIndex = getStepIndex(flowConfig, currentStepName);

  for (let stepIndex = currentIndex + 1; stepIndex < flowConfig.stepOrder.length; stepIndex++) {
    const candidateNextStepName = flowConfig.stepOrder[stepIndex];
    const candidateNextStep = flowConfig.steps[candidateNextStepName];

    if (!candidateNextStep || !candidateNextStep.showCondition) {
      // No show condition defined
      return candidateNextStepName;
    }

    if (candidateNextStep.showCondition(req)) {
      // Show condition matches
      return candidateNextStepName;
    }
  }

  return null;
}

async function getNextStepByRouteConditions(
  req: Request,
  currentStepName: string,
  flowConfig: JourneyFlowConfig,
  formData: Record<string, unknown>,
  currentStepData: Record<string, unknown>
) {
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
  if (flowConfig.useShowConditions) {
    // Rule deprecated: https://eslint.org/docs/latest/rules/no-return-await
    // eslint-disable-next-line no-return-await
    return await getPreviousStepByShowConditions(req, currentStepName, flowConfig);
  } else {
    // eslint-disable-next-line no-return-await
    return await getPreviousStepByRouteConditions(req, currentStepName, flowConfig, formData);
  }
}

async function getPreviousStepByShowConditions(req: Request, currentStepName: string, flowConfig: JourneyFlowConfig) {
  const currentStepConfig = flowConfig.steps[currentStepName];
  if (currentStepConfig?.preventBack) {
    return null;
  }

  const currentIndex = getStepIndex(flowConfig, currentStepName);

  for (let stepIndex = currentIndex - 1; stepIndex >= 0; stepIndex--) {
    const candidatePreviousStepName = flowConfig.stepOrder[stepIndex];
    const candidatePreviousStep = flowConfig.steps[candidatePreviousStepName];

    if (!candidatePreviousStep || !candidatePreviousStep.showCondition) {
      // No show condition defined
      return candidatePreviousStepName;
    }

    if (candidatePreviousStep.showCondition(req) && !candidatePreviousStep.preventBack) {
      // Show condition matches
      return candidatePreviousStepName;
    }
  }

  return null;
}

async function getPreviousStepByRouteConditions(
  req: Request,
  currentStepName: string,
  flowConfig: JourneyFlowConfig,
  formData: Record<string, unknown>
) {
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

export type StepNavigation = {
  getNextStepUrl: (
    req: Request,
    currentStepName: string,
    currentStepData?: Record<string, unknown>
  ) => Promise<string | null>;
  getBackUrl: (req: Request, currentStepName: string) => Promise<string | null>;
  getStepUrl: (stepName: string, caseReference?: string) => string;
};

export function createStepNavigation(
  flowConfigOrResolver: JourneyFlowConfig | JourneyFlowConfigResolver
): StepNavigation {
  return {
    getNextStepUrl: async (
      req: Request,
      currentStepName: string,
      currentStepData: Record<string, unknown> = {}
    ): Promise<string | null> => {
      const flowConfig = await resolveFlowConfig(req, flowConfigOrResolver);
      const formData = req.session?.formData || {};
      const caseReference = req.res?.locals.validatedCase?.id;
      const nextStep = await getNextStep(req, currentStepName, flowConfig, formData, currentStepData);
      return nextStep ? getStepUrl(nextStep, flowConfig, caseReference) : null;
    },

    getBackUrl: async (req: Request, currentStepName: string): Promise<string | null> => {
      const flowConfig = await resolveFlowConfig(req, flowConfigOrResolver);
      const formData = req.session?.formData || {};
      const caseReference = req.res?.locals.validatedCase?.id;
      const previousStep = await getPreviousStep(req, currentStepName, flowConfig, formData);
      return previousStep ? getStepUrl(previousStep, flowConfig, caseReference) : null;
    },

    getStepUrl: (stepName: string, caseReference?: string): string => {
      if (typeof flowConfigOrResolver === 'function') {
        throw new Error('getStepUrl requires a static JourneyFlowConfig when a resolver is used');
      }

      return getStepUrl(stepName, flowConfigOrResolver, caseReference);
    },
  };
}

export function stepDependencyCheckMiddleware(flowConfigOrResolver: JourneyFlowConfig | JourneyFlowConfigResolver) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const urlParts = req.path.split('/');
    const stepName = urlParts[urlParts.length - 1];

    if (!stepName) {
      return next();
    }

    const flowConfig = await resolveFlowConfig(req, flowConfigOrResolver);
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

function getStepIndex(flowConfig: JourneyFlowConfig, stepName: string) {
  const stepIndex = flowConfig.stepOrder.indexOf(stepName);
  if (stepIndex === -1) {
    throw new Error(`Step ${stepName} not found in stepOrder`);
  }
  return stepIndex;
}
