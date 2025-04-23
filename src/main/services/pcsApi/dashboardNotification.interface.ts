export interface DashboardNotification {
  templateId: string;
  templateValues: {
    [key:string]: unknown
  };
}
