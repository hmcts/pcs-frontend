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

export type StepKind = 'question' | 'interstitial' | 'cya';

export type SectionStatus = 'NOT_APPLICABLE' | 'NOT_AVAILABLE_YET' | 'AVAILABLE' | 'IN_PROGRESS' | 'DONE';

export interface SectionAvailability {
  available: boolean;
  reason?: string;
}

export type SectionAvailabilityPredicate = (req: Request) => SectionAvailability;

export interface SectionConfig {
  id: string;
  groupId?: string;
  titleKey: string;
  steps: string[];
  isApplicable?: SectionApplicabilityCondition;
  dependsOn?: string[];
  isAvailable?: SectionAvailabilityPredicate;
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
  // When set, the back-link from the first visible step of any section returns
  // here instead of walking back into the previous section.
  hubStepName?: string;
}
