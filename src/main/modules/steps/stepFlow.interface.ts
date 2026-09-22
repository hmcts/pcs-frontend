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

export const SECTION_STATUS = {
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  NOT_AVAILABLE_YET: 'NOT_AVAILABLE_YET',
  AVAILABLE: 'AVAILABLE',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
} as const;

export type SectionStatus = (typeof SECTION_STATUS)[keyof typeof SECTION_STATUS];

export interface SectionConfig {
  id: string;
  groupId?: string;
  titleKey: string;
  steps: readonly string[];
  isApplicable?: SectionApplicabilityCondition;
  dependsOn?: readonly string[];
}

export interface JourneyFlowConfig {
  basePath?: string;
  journeyName?: string;
  useShowConditions?: boolean;
  useSessionFormData?: boolean;
  /**
   * CCD event ID started/resumed by this journey.
   *
   * Required when the journey is registered via `registerAllJourneys` (enforced at app boot).
   * Optional on flow configs used only by the step/flow engine (e.g. tests, journey variants
   * whose `eventId` is read from the default variant).
   */
  eventId?: string;
  entryStepIdAtBasePath?: string;
  stepOrder?: readonly string[];
  nonSectionStepOrder?: readonly string[];
  steps: Record<string, StepConfig>;
  sections?: readonly SectionConfig[];
  // When set, the back-link from the first visible step of any section returns
  // here instead of walking back into the previous section.
  hubStepName?: string;
}
