// Service-side re-exports of the domain types defined in
// `modules/steps/stepFlow.interface.ts`. Service consumers import everything
// from here so they don't reach into the framework module directly.

export type {
  SectionStatus,
  StepKind,
  SectionAvailability,
  SectionAvailabilityPredicate,
  SectionConfig,
  JourneyFlowConfig,
} from '../../modules/steps/stepFlow.interface';

export type { StepDefinition } from '../../modules/steps/stepFormData.interface';
