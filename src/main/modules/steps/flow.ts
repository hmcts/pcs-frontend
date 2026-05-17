import { NextFunction, Request, Response } from 'express';

import { Logger } from '@modules/logger';
import type { JourneyFlowConfig, JourneyFlowConfigResolver, SectionConfig } from '@modules/steps/stepFlow.interface';

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
  if (flowConfig.stepOrder?.length) {
    return getNextStepByShowConditionFlat(req, currentStepName, flowConfig);
  }
  return getNextStepBySectionTraversal(req, currentStepName, flowConfig);
}

function getNextStepByShowConditionFlat(req: Request, currentStepName: string, flowConfig: JourneyFlowConfig) {
  const stepOrder = getStepOrder(flowConfig);
  const currentIndex = getStepIndex(stepOrder, currentStepName);

  for (let stepIndex = currentIndex + 1; stepIndex < stepOrder.length; stepIndex++) {
    const candidateNextStepName = stepOrder[stepIndex];
    if (isStepVisible(flowConfig, candidateNextStepName, req)) {
      return candidateNextStepName;
    }
  }

  return null;
}

async function getNextStepBySectionTraversal(req: Request, currentStepName: string, flowConfig: JourneyFlowConfig) {
  const sections = flowConfig.sections!;
  const nonSectionSteps = flowConfig.nonSectionStepOrder ?? [];
  const location = locateStep(currentStepName, sections, nonSectionSteps);

  if (!location) {
    throw new Error(`Step ${currentStepName} not found in stepOrder`);
  }

  if (location.kind === 'section') {
    const { sectionIndex, stepIndex } = location;
    const currentSection = sections[sectionIndex];

    // Stay within current section if it remains applicable.
    if (await isSectionApplicableAtRuntime(currentSection, req)) {
      const remainingInSection = currentSection.steps.slice(stepIndex + 1);
      const next = firstVisible(remainingInSection, flowConfig, req);
      if (next) {
        return next;
      }
    }

    // Walk forward through subsequent applicable sections.
    for (let i = sectionIndex + 1; i < sections.length; i++) {
      const section = sections[i];
      if (!(await isSectionApplicableAtRuntime(section, req))) {
        continue;
      }
      const next = firstVisible(section.steps, flowConfig, req);
      if (next) {
        return next;
      }
    }

    // Fall through to non-section steps.
    return firstVisible(nonSectionSteps, flowConfig, req) ?? null;
  }

  // Current step is in nonSectionStepOrder — only walk forward within that list.
  const remainingNonSection = nonSectionSteps.slice(location.stepIndex + 1);
  return firstVisible(remainingNonSection, flowConfig, req) ?? null;
}

async function getNextStepByRouteConditions(
  req: Request,
  currentStepName: string,
  flowConfig: JourneyFlowConfig,
  formData: Record<string, unknown>,
  currentStepData: Record<string, unknown>
) {
  const stepConfig = flowConfig.steps[currentStepName];
  const stepOrder = getStepOrder(flowConfig);

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

  const currentIndex = stepOrder.indexOf(currentStepName);
  if (currentIndex >= 0 && currentIndex < stepOrder.length - 1) {
    return stepOrder[currentIndex + 1];
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

  if (flowConfig.stepOrder?.length) {
    return getPreviousStepByShowConditionsFlat(req, currentStepName, flowConfig);
  }
  return getPreviousStepBySectionTraversal(req, currentStepName, flowConfig);
}

function getPreviousStepByShowConditionsFlat(req: Request, currentStepName: string, flowConfig: JourneyFlowConfig) {
  const stepOrder = getStepOrder(flowConfig);
  const currentIndex = getStepIndex(stepOrder, currentStepName);

  for (let stepIndex = currentIndex - 1; stepIndex >= 0; stepIndex--) {
    const candidatePreviousStepName = stepOrder[stepIndex];
    if (isStepVisibleAndCanGoBack(flowConfig, candidatePreviousStepName, req)) {
      return candidatePreviousStepName;
    }
  }

  return null;
}

async function getPreviousStepBySectionTraversal(req: Request, currentStepName: string, flowConfig: JourneyFlowConfig) {
  const sections = flowConfig.sections!;
  const nonSectionSteps = flowConfig.nonSectionStepOrder ?? [];
  const location = locateStep(currentStepName, sections, nonSectionSteps);

  if (!location) {
    throw new Error(`Step ${currentStepName} not found in stepOrder`);
  }

  if (location.kind === 'nonSection') {
    // Walk backward within nonSection list first.
    for (let i = location.stepIndex - 1; i >= 0; i--) {
      if (isStepVisibleAndCanGoBack(flowConfig, nonSectionSteps[i], req)) {
        return nonSectionSteps[i];
      }
    }
    // Fall back to walking sections in reverse.
    for (let i = sections.length - 1; i >= 0; i--) {
      const section = sections[i];
      if (!(await isSectionApplicableAtRuntime(section, req))) {
        continue;
      }
      const prev = lastVisibleAndCanGoBack(section.steps, flowConfig, req);
      if (prev) {
        return prev;
      }
    }
    return null;
  }

  const { sectionIndex, stepIndex } = location;
  const currentSection = sections[sectionIndex];

  // Stay within current section if it remains applicable.
  if (await isSectionApplicableAtRuntime(currentSection, req)) {
    const earlierInSection = currentSection.steps.slice(0, stepIndex);
    const prev = lastVisibleAndCanGoBack(earlierInSection, flowConfig, req);
    if (prev) {
      return prev;
    }
  }

  if (flowConfig.hubStepName && nonSectionSteps.includes(flowConfig.hubStepName)) {
    return flowConfig.hubStepName;
  }

  // Walk previous applicable sections in reverse.
  for (let i = sectionIndex - 1; i >= 0; i--) {
    const section = sections[i];
    if (!(await isSectionApplicableAtRuntime(section, req))) {
      continue;
    }
    const prev = lastVisibleAndCanGoBack(section.steps, flowConfig, req);
    if (prev) {
      return prev;
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
  const stepOrder = getStepOrder(flowConfig);

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
  const currentIndex = stepOrder.indexOf(currentStepName);
  if (currentIndex > 0) {
    return stepOrder[currentIndex - 1];
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

function getStepIndex(stepOrder: readonly string[], stepName: string) {
  const stepIndex = stepOrder.indexOf(stepName);
  if (stepIndex === -1) {
    throw new Error(`Step ${stepName} not found in stepOrder`);
  }
  return stepIndex;
}

export function getStepOrder(flowConfig: JourneyFlowConfig): readonly string[] {
  if (flowConfig.stepOrder?.length) {
    return flowConfig.stepOrder;
  }

  if (!flowConfig.sections) {
    throw new Error('JourneyFlowConfig requires stepOrder when sections are not configured');
  }

  const sectionSteps = flowConfig.sections.flatMap(section => section.steps);
  const nonSectionSteps = flowConfig.nonSectionStepOrder ?? [];
  return [...sectionSteps, ...nonSectionSteps];
}

type StepLocation =
  | { kind: 'section'; sectionIndex: number; stepIndex: number }
  | { kind: 'nonSection'; stepIndex: number };

function locateStep(
  stepName: string,
  sections: readonly SectionConfig[],
  nonSectionSteps: readonly string[]
): StepLocation | null {
  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
    const stepIndex = sections[sectionIndex].steps.indexOf(stepName);
    if (stepIndex !== -1) {
      return { kind: 'section', sectionIndex, stepIndex };
    }
  }
  const nonSectionIndex = nonSectionSteps.indexOf(stepName);
  if (nonSectionIndex !== -1) {
    return { kind: 'nonSection', stepIndex: nonSectionIndex };
  }
  return null;
}

async function isSectionApplicableAtRuntime(section: SectionConfig, req: Request): Promise<boolean> {
  if (!section.isApplicable) {
    return true;
  }
  return section.isApplicable(req);
}

function isStepVisible(flowConfig: JourneyFlowConfig, stepName: string, req: Request): boolean {
  const stepConfig = flowConfig.steps[stepName];
  if (!stepConfig || !stepConfig.showCondition) {
    return true;
  }
  return stepConfig.showCondition(req);
}

function isStepVisibleAndCanGoBack(flowConfig: JourneyFlowConfig, stepName: string, req: Request): boolean {
  const stepConfig = flowConfig.steps[stepName];
  if (!stepConfig || !stepConfig.showCondition) {
    return true;
  }
  return stepConfig.showCondition(req) && !stepConfig.preventBack;
}

function firstVisible(stepNames: readonly string[], flowConfig: JourneyFlowConfig, req: Request): string | undefined {
  return stepNames.find(stepName => isStepVisible(flowConfig, stepName, req));
}

function lastVisibleAndCanGoBack(
  stepNames: readonly string[],
  flowConfig: JourneyFlowConfig,
  req: Request
): string | undefined {
  for (let i = stepNames.length - 1; i >= 0; i--) {
    if (isStepVisibleAndCanGoBack(flowConfig, stepNames[i], req)) {
      return stepNames[i];
    }
  }
  return undefined;
}
