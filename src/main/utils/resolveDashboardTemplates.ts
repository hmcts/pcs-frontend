import { escapeHtml, notificationTemplates, taskTemplates } from './dashboardTemplates';

export interface ResolvedNotification {
  title: string;
  body: string;
}

export function resolveNotification(templateId: string, params: Record<string, unknown>): ResolvedNotification {
  const template = notificationTemplates[templateId];
  if (template) {
    return { title: template.title, body: template.render(params) };
  }
  return { title: templateId, body: escapeHtml(JSON.stringify(params)) };
}

export function resolveTaskTitle(templateId: string): string {
  return taskTemplates[templateId]?.title ?? templateId;
}

export function resolveTaskHint(templateId: string, params: Record<string, unknown>): { html: string } | undefined {
  const template = taskTemplates[templateId];
  if (template?.hintRender && Object.keys(params).length > 0) {
    return { html: template.hintRender(params) };
  }
  return undefined;
}
