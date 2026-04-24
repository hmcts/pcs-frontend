import type { TaskStatus } from '@services/dashboard.interface';

const TAG_CLASSES: Partial<Record<TaskStatus, string>> = {
  AVAILABLE: 'govuk-tag--blue',
  IN_PROGRESS: 'govuk-tag--red',
  COMPLETED: 'govuk-tag--green',
  NOT_STARTED: 'govuk-tag--red',
};

export const isLinkableStatus = (status: string): boolean => status !== 'NOT_AVAILABLE' && status !== 'COMPLETED';

export const getTagClasses = (status: string): string | undefined => TAG_CLASSES[status as TaskStatus];
