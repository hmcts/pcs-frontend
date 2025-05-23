export interface DashboardTaskGroup {
  groupId: 'CLAIM' | 'HEARING' | 'JUDGEMENT' | 'NOTICE' | 'RESPONSE' | 'APPLICATIONS';
  tasks: DashboardTask[];
}

export interface DashboardTask {
  templateId: string;
  templateValues: Record<string, unknown>;
  status: 'NOT_AVAILABLE' | 'AVAILABLE' | 'ACTION_NEEDED' | 'IN_PROGRESS' | 'OPTIONAL' | 'COMPLETED';
}

export const STATUS_MAP: Record<DashboardTask['status'], { text?: string; tag?: { text: string; classes?: string } }> =
  {
    NOT_AVAILABLE: { tag: { text: 'Not available yet', classes: 'govuk-tag--grey' } },
    AVAILABLE: { tag: { text: 'Available', classes: 'govuk-tag--blue' } },
    ACTION_NEEDED: { tag: { text: 'Action needed', classes: 'govuk-tag--red' } },
    IN_PROGRESS: { tag: { text: 'In progress', classes: 'govuk-tag--yellow' } },
    OPTIONAL: { tag: { text: 'Optional', classes: 'govuk-tag--blue' } },
    COMPLETED: { text: 'Completed' },
  };

export const TASK_GROUP_MAP: Record<DashboardTaskGroup['groupId'], string> = {
  CLAIM: 'The claim',
  HEARING: 'Hearing',
  JUDGEMENT: 'Judgement from the court',
  NOTICE: 'Orders and notices from the court',
  RESPONSE: 'The response',
  APPLICATIONS: 'Applications',
};
