export interface NotificationTemplate {
  title: string;
  render: (params: Record<string, unknown>) => string;
}

export interface TaskTemplate {
  title: string;
  hintRender?: (params: Record<string, unknown>) => string;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Notification templates -- keyed by CCD templateId

export const notificationTemplates: Record<string, NotificationTemplate> = {
  'Defendant.CaseIssued': {
    title: 'Case issued',
    render: params => `Your case has been issued. Respond by ${escapeHtml(params.responseEndDate)}.`,
  },
  'Defendant.ResponseToClaim': {
    title: 'Response to claim',
    render: params => escapeHtml(params.ctaLabel ?? 'A response to the claim has been submitted.'),
  },
};

// Task templates -- keyed by CCD templateId

export const taskTemplates: Record<string, TaskTemplate> = {
  'Defendant.ViewClaim': { title: 'View the claim' },
  'Defendant.RespondToClaim': { title: 'Respond to the claim' },
  'Defendant.ViewDocuments': { title: 'View documents' },
};
