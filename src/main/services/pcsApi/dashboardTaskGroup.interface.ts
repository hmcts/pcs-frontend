export interface DashboardTaskGroup {
  groupId: 'CLAIM' | 'HEARING' | 'JUDGEMENT' | 'NOTICE' | 'RESPONSE' | 'APPLICATIONS';
  tasks: DashboardTask[];
}

export interface DashboardTask {
  templateId: string;
  templateValues: Record<string, unknown>;
  status: string;
}

export type TaskStatus = 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';

export const STATUS_MAP: Record<TaskStatus, { tag: { text: string; classes: string } }> = {
  AVAILABLE: { tag: { text: 'Available', classes: 'govuk-tag--blue' } },
  IN_PROGRESS: { tag: { text: 'In progress', classes: 'govuk-tag--red' } },
  COMPLETED: { tag: { text: 'Completed', classes: 'govuk-tag--green' } },
};

export const TASK_GROUP_MAP: Record<DashboardTaskGroup['groupId'], string> = {
  CLAIM: 'The claim',
  HEARING: 'Hearing',
  JUDGEMENT: 'Judgement from the court',
  NOTICE: 'Orders and notices from the court',
  RESPONSE: 'The response',
  APPLICATIONS: 'Applications',
};
