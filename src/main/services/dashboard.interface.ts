import { GenAppType } from './ccdCase.interface';

export interface DashboardNotification {
  templateId: string;
  templateValues: {
    [key: string]: unknown;
  };
}

export interface DashboardTask {
  templateId: string;
  status: string;
}

export interface DashboardTaskGroup {
  groupId: 'CLAIM' | 'HEARING' | 'JUDGEMENT' | 'NOTICE' | 'RESPONSE' | 'APPLICATIONS' | 'DOCUMENTS';
  tasks: DashboardTask[];
}

export interface DashboardRelatedApplication {
  id: string;
  type: GenAppType;
  applicationSubmittedDate?: string;
}

export type TaskStatus = 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED' | 'NOT_STARTED' | 'NOT_AVAILABLE';
