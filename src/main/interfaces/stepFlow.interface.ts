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

/**
 * Type for previousStep configuration.
 * Can be:
 * - A static string: the step name to navigate back to
 * - A function with Request only (preferred)
 * - A function with Request and formData (deprecated)
 */
export type PreviousStep =
  | string
  | ((req: Request) => string | Promise<string>) /**
   * @deprecated Use the signature without formData parameter: (req: Request) => string | Promise<string>
   * The formData parameter will be removed in a future version.
   * If you need to check the user's journey, use req.session?.formData instead.
   */
  | ((req: Request, formData: Record<string, unknown>) => string | Promise<string>);

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
