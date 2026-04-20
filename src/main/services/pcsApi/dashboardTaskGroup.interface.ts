export interface DashboardTaskGroup {
  groupId: 'CLAIM' | 'HEARING' | 'JUDGEMENT' | 'NOTICE' | 'RESPONSE' | 'APPLICATIONS';
  tasks: DashboardTask[];
}

export interface DashboardTask {
  templateId: string;
  status: string;
}

export type TaskStatus = 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED' | 'NOT_STARTED' | 'NOT_AVAILABLE';

const TAG_CLASSES: Partial<Record<TaskStatus, string>> = {
  AVAILABLE: 'govuk-tag--blue',
  IN_PROGRESS: 'govuk-tag--red',
  COMPLETED: 'govuk-tag--green',
  NOT_STARTED: 'govuk-tag--red',
};

export const isLinkableStatus = (status: string): boolean => status !== 'NOT_AVAILABLE' && status !== 'COMPLETED';

export const getTagClasses = (status: string): string | undefined => TAG_CLASSES[status as TaskStatus];
