/**
 * Condition function that determines if a route should be taken
 */
export type StepCondition = (formData: Record<string, unknown>, currentStepData: Record<string, unknown>) => boolean;

/**
 * Defines where to go next based on conditions
 */
export interface StepRoute {
  /**
   * Condition to check. If not provided, this is the default route.
   * If multiple routes are provided, the first matching condition is used.
   */
  condition?: StepCondition;
  /**
   * Name of the next step to go to
   */
  nextStep: string;
}

/**
 * Step flow configuration
 */
export interface StepConfig {
  /**
   * Dependencies - steps that must be completed before this step can be accessed
   */
  dependencies?: string[];
  /**
   * Routes to determine where to go after this step is submitted
   * If multiple routes are provided, the first matching condition is used.
   */
  routes?: StepRoute[];
  /**
   * Default next step if no routes are provided or no conditions match
   */
  defaultNext?: string;
  /**
   * Whether this step requires authentication
   */
  requiresAuth?: boolean;
}

/**
 * Complete step flow configuration for a journey
 */
export interface JourneyFlowConfig {
  /**
   * Base path for the journey URLs (e.g., '/steps/user-journey', '/defendant', '/applicant')
   * If not provided, defaults to '/steps/{journeyName}'
   */
  basePath?: string;
  /**
   * Journey name/path used for URL generation (e.g., 'user-journey', 'eligibility')
   * Only used if basePath is not provided
   */
  journeyName?: string;
  /**
   * Ordered list of step names defining the default flow
   */
  stepOrder: string[];
  /**
   * Configuration for each step
   */
  steps: Record<string, StepConfig>;
}

/**
 * Get the next step name for a given step
 */
export function getNextStep(
  currentStepName: string,
  flowConfig: JourneyFlowConfig,
  formData: Record<string, unknown>,
  currentStepData: Record<string, unknown> = {}
): string | null {
  const stepConfig = flowConfig.steps[currentStepName];
  if (!stepConfig) {
    // If no config, use step order
    const currentIndex = flowConfig.stepOrder.indexOf(currentStepName);
    if (currentIndex >= 0 && currentIndex < flowConfig.stepOrder.length - 1) {
      return flowConfig.stepOrder[currentIndex + 1];
    }
    return null;
  }

  // Check conditional routes first
  if (stepConfig.routes && stepConfig.routes.length > 0) {
    for (const route of stepConfig.routes) {
      if (!route.condition || route.condition(formData, currentStepData)) {
        return route.nextStep;
      }
    }
  }

  // Use default next step if provided
  if (stepConfig.defaultNext) {
    return stepConfig.defaultNext;
  }

  // Otherwise, use step order
  const currentIndex = flowConfig.stepOrder.indexOf(currentStepName);
  if (currentIndex >= 0 && currentIndex < flowConfig.stepOrder.length - 1) {
    return flowConfig.stepOrder[currentIndex + 1];
  }

  return null;
}

/**
 * Get the previous step name for a given step
 */
export function getPreviousStep(currentStepName: string, flowConfig: JourneyFlowConfig): string | null {
  const currentIndex = flowConfig.stepOrder.indexOf(currentStepName);
  if (currentIndex > 0) {
    return flowConfig.stepOrder[currentIndex - 1];
  }
  return null;
}

/**
 * Get the URL for a step by name
 * @param stepName - Name of the step
 * @param flowConfig - Journey flow configuration
 */
export function getStepUrl(stepName: string, flowConfig: JourneyFlowConfig): string {
  // Use basePath if provided, otherwise construct from journeyName
  if (flowConfig.basePath) {
    return `${flowConfig.basePath}/${stepName}`;
  }

  // Fallback to default structure if journeyName is provided
  if (flowConfig.journeyName) {
    return `/steps/${flowConfig.journeyName}/${stepName}`;
  }

  // Last resort: just use step name (shouldn't happen in practice)
  return `/${stepName}`;
}

/**
 * Check if a step can be accessed based on dependencies
 * @returns Name of the first missing dependency, or null if all dependencies are met
 */
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
    // A dependency is considered complete if the step's data exists in formData
    if (!formData[dependency]) {
      return dependency;
    }
  }

  return null;
}
