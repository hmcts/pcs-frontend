import type { TFunction } from 'i18next';

export interface ResolvedNotification {
  title: string;
  body: string;
}

export interface ResolvedTask {
  title: string;
}

const MISSING_TRANSLATION_KEY_VALUE = '__MISSING_TRANSLATION__';

export function lookup(t: TFunction, key: string, values: Record<string, unknown> = {}, escape = false): string | null {
  const translated = t(key, {
    defaultValue: MISSING_TRANSLATION_KEY_VALUE,
    interpolation: { escapeValue: escape },
    ...values,
  }) as string;
  return translated === MISSING_TRANSLATION_KEY_VALUE ? null : translated;
}

const withCaseRef = (values: Record<string, unknown>, caseReference: string) => ({ caseReference, ...values });

export function resolveNotification(
  t: TFunction,
  templateId: string,
  values: Record<string, unknown>,
  caseReference: string
): ResolvedNotification | null {
  const merged = withCaseRef(values, caseReference);
  const title = lookup(t, `dashboard:notifications.${templateId}.title`);
  const body = lookup(t, `dashboard:notifications.${templateId}.body`, merged, true);
  if (!title || !body) {
    return null;
  }
  return { title, body };
}

export function resolveTask(t: TFunction, templateId: string): ResolvedTask | null {
  const title = lookup(t, `dashboard:tasks.${templateId}.title`);
  if (!title) {
    return null;
  }
  return { title };
}
