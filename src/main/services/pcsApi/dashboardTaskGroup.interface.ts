export interface DashboardTaskGroup {
  groupId: 'CLAIM' | 'HEARING' | 'JUDGEMENT' | 'NOTICE' | 'RESPONSE' | 'APPLICATIONS';
  tasks: DashboardTask[];
}

export interface DashboardTask {
  templateId: string;
  templateValues: Record<string, unknown>;
  status: 'NOT_AVAILABLE' | 'AVAILABLE' | 'ACTION_NEEDED' | 'IN_PROGRESS' | 'OPTIONAL' | 'COMPLETED';
}

export const STATUS_MAP: Record<DashboardTask['status'], { text: string; classes: string }> = {
  NOT_AVAILABLE: { text: 'Not available yet', classes: 'govuk-tag--grey' },
  AVAILABLE: { text: 'Available', classes: 'govuk-tag--blue' },
  ACTION_NEEDED: { text: 'Action needed', classes: 'govuk-tag--red' },
  IN_PROGRESS: { text: 'In progress', classes: 'govuk-tag--yellow' },
  OPTIONAL: { text: 'Optional', classes: 'govuk-tag--blue' },
  COMPLETED: { text: 'Completed', classes: 'govuk-tag--green' },
};

export const TASK_GROUP_MAP: Record<DashboardTaskGroup['groupId'], string> = {
  CLAIM: 'The claim',
  HEARING: 'Hearing',
  JUDGEMENT: 'Judgement',
  NOTICE: 'Orders and notices from the court',
  RESPONSE: 'The response',
  APPLICATIONS: 'Applications',
};
