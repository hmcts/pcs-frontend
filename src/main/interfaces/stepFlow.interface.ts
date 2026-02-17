import { type Request } from 'express';
export type StepCondition = (
  req: Request,
  formData: Record<string, unknown>,
  currentStepData: Record<string, unknown>
) => Promise<boolean>;

export interface StepRoute {
  condition?: StepCondition;
  nextStep: string;
}

export type PreviousStep = string | ((req: Request, formData: Record<string, unknown>) => string | Promise<string>);

export interface StepConfig {
  dependencies?: string[];
  routes?: StepRoute[];
  defaultNext?: string;
  previousStep?: PreviousStep;
  requiresAuth?: boolean;
}

export interface JourneyFlowConfig {
  basePath?: string;
  journeyName?: string;
  stepOrder: string[];
  steps: Record<string, StepConfig>;
}
