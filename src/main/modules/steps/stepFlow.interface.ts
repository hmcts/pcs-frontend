import { type Request } from 'express';

export type StepCondition = (
  req: Request,
  formData: Record<string, unknown>,
  currentStepData: Record<string, unknown>
) => Promise<boolean>;

export type JourneyFlowConfigResolver = (req: Request) => JourneyFlowConfig | Promise<JourneyFlowConfig>;

export type ShowCondition = (req: Request) => boolean;

export interface StepRoute {
  condition?: StepCondition;
  nextStep: string;
}

/**
 * Type for previousStep configuration.
 * Can be:
 * - A static string: the step name to navigate back to
 * - A function with Request only
 * - A function with Request and formData
 */
export type PreviousStep =
  | string
  | ((req: Request) => string | Promise<string>)
  | ((req: Request, formData: Record<string, unknown>) => string | Promise<string>);

export interface StepConfig {
  dependencies?: string[];
  routes?: StepRoute[];
  defaultNext?: string;
  previousStep?: PreviousStep;
  requiresAuth?: boolean;
  showCondition?: ShowCondition;
  preventBack?: boolean;
}

export type SectionApplicabilityCondition = (req: Request) => Promise<boolean>;

export interface SectionConfig {
  id: string;
  titleKey: string;
  steps: string[];
  // Does the section apply to this case at all (e.g. payments needs a rent-arrears ground)?
  isApplicable?: SectionApplicabilityCondition;
  // Section ids that must be completed before this section becomes available.
  // Consumed by the (future) section-status service — see docs/HDPI-5407/cya-refactor-plan.md.
  dependsOn?: string[];
}

export interface JourneyFlowConfig {
  basePath?: string;
  journeyName?: string;
  useShowConditions?: boolean;
  useSessionFormData?: boolean;
  stepOrder?: string[];
  nonSectionStepOrder?: string[];
  steps: Record<string, StepConfig>;
  sections?: SectionConfig[];
}
