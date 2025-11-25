export type StepCondition = (formData: Record<string, unknown>, currentStepData: Record<string, unknown>) => boolean;

export interface StepRoute {
  condition?: StepCondition;
  nextStep: string;
}

export interface StepConfig {
  dependencies?: string[];
  routes?: StepRoute[];
  defaultNext?: string;
  requiresAuth?: boolean;
}

export interface JourneyFlowConfig {
  basePath?: string;
  journeyName?: string;
  stepOrder: string[];
  steps: Record<string, StepConfig>;
}
