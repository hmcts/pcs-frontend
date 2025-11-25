import { Logger } from '@hmcts/nodejs-logging';
import { NextFunction, Request, Response } from 'express';

import type { JourneyFlowConfig } from '../../interfaces/stepFlow.interface';
import { userJourneyFlowConfig } from '../../steps/userJourney/flow.config';

const logger = Logger.getLogger('stepDependencyCheck');

export function getNextStep(
  currentStepName: string,
  flowConfig: JourneyFlowConfig,
  formData: Record<string, unknown>,
  currentStepData: Record<string, unknown> = {}
): string | null {
  const stepConfig = flowConfig.steps[currentStepName];

  if (stepConfig?.routes) {
    for (const route of stepConfig.routes) {
      if (!route.condition || route.condition(formData, currentStepData)) {
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

export function getPreviousStep(currentStepName: string, flowConfig: JourneyFlowConfig): string | null {
  const currentIndex = flowConfig.stepOrder.indexOf(currentStepName);
  if (currentIndex > 0) {
    return flowConfig.stepOrder[currentIndex - 1];
  }
  return null;
}

export function getStepUrl(stepName: string, flowConfig: JourneyFlowConfig): string {
  if (flowConfig.basePath) {
    return `${flowConfig.basePath}/${stepName}`;
  }

  if (flowConfig.journeyName) {
    return `/steps/${flowConfig.journeyName}/${stepName}`;
  }

  return `/${stepName}`;
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
  getNextStepUrl: (req: Request, currentStepName: string, currentStepData?: Record<string, unknown>) => string | null;
  getBackUrl: (req: Request, currentStepName: string) => string | null;
  getStepUrl: (stepName: string) => string;
} {
  return {
    getNextStepUrl: (
      req: Request,
      currentStepName: string,
      currentStepData: Record<string, unknown> = {}
    ): string | null => {
      const formData = req.session.formData || {};
      const nextStep = getNextStep(currentStepName, flowConfig, formData, currentStepData);
      return nextStep ? getStepUrl(nextStep, flowConfig) : null;
    },

    getBackUrl: (req: Request, currentStepName: string): string | null => {
      const previousStep = getPreviousStep(currentStepName, flowConfig);
      return previousStep ? getStepUrl(previousStep, flowConfig) : null;
    },

    getStepUrl: (stepName: string): string => {
      return getStepUrl(stepName, flowConfig);
    },
  };
}

export const stepNavigation = createStepNavigation(userJourneyFlowConfig);

export function stepDependencyCheckMiddleware(flowConfig: JourneyFlowConfig = userJourneyFlowConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const urlParts = req.path.split('/');
    const stepName = urlParts[urlParts.length - 1];

    if (!stepName) {
      return next();
    }

    const formData = req.session.formData || {};
    const missingDependency = checkStepDependencies(stepName, flowConfig, formData);

    if (missingDependency) {
      logger.debug(`Step ${stepName} has unmet dependency: ${missingDependency}`);
      const dependencyUrl = getStepUrl(missingDependency, flowConfig);
      return res.redirect(303, dependencyUrl);
    }

    next();
  };
}
