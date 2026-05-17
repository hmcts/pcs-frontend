import type { SectionStatus } from './types';

const TAG_CLASSES: Partial<Record<SectionStatus, string>> = {
  AVAILABLE: 'govuk-tag govuk-tag--turquoise',
  IN_PROGRESS: 'govuk-tag govuk-tag--blue',
  DONE: 'govuk-tag govuk-tag--green',
};

export const getStatusTagClasses = (status: SectionStatus): string | undefined => TAG_CLASSES[status];
