import type { TFunction } from 'i18next';

import { getNotificationUrlPlaceholders } from './dashboardTaskPaths';
import { formatLocalisedDate } from './formatLocalisedDate';

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

function withFeeAmountAsNumber(values: Record<string, unknown>): Record<string, unknown> {
  const feeAmount = values.feeAmount;
  if (feeAmount === undefined || feeAmount === null || feeAmount === '') {
    return values;
  }

  const asNumber = typeof feeAmount === 'number' ? feeAmount : Number(feeAmount);
  if (Number.isNaN(asNumber)) {
    return values;
  }

  return { ...values, feeAmount: asNumber };
}

// Only plain ISO dates (2026-11-12) or date-times; anything else is left exactly as sent.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

/** Shows ISO date template values in the page language, e.g. 12 Tachwedd 2026. */
function withLocalisedDates(values: Record<string, unknown>, lang?: string): Record<string, unknown> {
  if (!lang) {
    return values;
  }
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      typeof value === 'string' && ISO_DATE.test(value.trim()) ? (formatLocalisedDate(value, lang) ?? value) : value,
    ])
  );
}

export function resolveNotification(
  t: TFunction,
  templateId: string,
  values: Record<string, unknown>,
  caseReference: string,
  lang?: string
): ResolvedNotification | null {
  const merged = withFeeAmountAsNumber({
    ...withCaseRef(withLocalisedDates(values, lang), caseReference),
    ...getNotificationUrlPlaceholders(caseReference),
  });
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
