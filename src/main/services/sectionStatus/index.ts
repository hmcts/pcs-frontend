export { getSectionStatus } from './getSectionStatus';
export { getAllSectionStatuses } from './getAllSectionStatuses';
export { getFirstVisibleStep } from './getFirstVisibleStep';
export { getStatusTagClasses } from './sectionStatusTags';
export { validateSectionConfig, SectionConfigError } from './validateSectionConfig';

export type {
  SectionStatus,
  StepKind,
  SectionAvailability,
  SectionAvailabilityPredicate,
  SectionConfig,
  JourneyFlowConfig,
  StepDefinition,
} from './types';
