import { type Request } from 'express';

export type StepCondition = (
  req: Request,
  formData: Record<string, unknown>,
  currentStepData: Record<string, unknown>
) => Promise<boolean>;

export type ShowCondition = (req: Request) => boolean;

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
  showCondition?: ShowCondition;
  preventBack?: boolean;
}

export interface JourneyFlowConfig {
  basePath?: string;
  journeyName?: string;
  useShowConditions?: boolean;
  stepOrder: string[];
  steps: Record<string, StepConfig>;
}
