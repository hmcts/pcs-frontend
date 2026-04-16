export interface DashboardTaskGroup {
  groupId: 'CLAIM' | 'HEARING' | 'JUDGEMENT' | 'NOTICE' | 'RESPONSE' | 'APPLICATIONS';
  tasks: DashboardTask[];
}

export interface DashboardTask {
  templateId: string;
  templateValues: Record<string, unknown>;
  status: string;
}

export type TaskStatus = 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED' | 'NOT_STARTED' | 'NOT_AVAILABLE';

export interface TaskStatusPresentation {
  tag?: { text: string; classes: string };
  linkable: boolean;
}

export const STATUS_MAP: Record<TaskStatus, TaskStatusPresentation> = {
  AVAILABLE: { tag: { text: 'Available', classes: 'govuk-tag--blue' }, linkable: true },
  IN_PROGRESS: { tag: { text: 'In progress', classes: 'govuk-tag--red' }, linkable: true },
  COMPLETED: { tag: { text: 'Completed', classes: 'govuk-tag--green' }, linkable: true },
  NOT_STARTED: { tag: { text: 'Not started', classes: 'govuk-tag--red' }, linkable: true },
  NOT_AVAILABLE: { linkable: false },
};

export const TASK_GROUP_MAP: Record<DashboardTaskGroup['groupId'], string> = {
  CLAIM: 'The claim',
  HEARING: 'Hearing',
  JUDGEMENT: 'Judgement from the court',
  NOTICE: 'Orders and notices from the court',
  RESPONSE: 'The response',
  APPLICATIONS: 'Applications',
};
