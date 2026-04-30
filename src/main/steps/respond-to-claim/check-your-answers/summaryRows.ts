import type { TFunction } from 'i18next';

export type SummaryListItem = {
  key: { text: string };
  value: { text: string };
  actions: {
    items: {
      href: string;
      text: string;
      visuallyHiddenText: string;
    }[];
  };
};

type RenderableField = {
  componentType?: string;
  component?: Record<string, unknown>;
  name?: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function getQuestionTextFromField(field: RenderableField): string | null {
  if (!field.component || typeof field.component !== 'object') {
    return null;
  }

  const component = field.component;
  const fieldset = component.fieldset as { legend?: { text?: unknown } } | undefined;
  const legendText = fieldset?.legend?.text;
  if (isNonEmptyString(legendText)) {
    return legendText.trim();
  }

  const label = component.label as { text?: unknown } | undefined;
  if (isNonEmptyString(label?.text)) {
    return label.text.trim();
  }

  return isNonEmptyString(field.name) ? field.name : null;
}

function getSelectionAnswerText(items: unknown, allowMultiple: boolean): string | null {
  if (!Array.isArray(items)) {
    return null;
  }

  const selected = items
    .filter(
      item =>
        typeof item === 'object' &&
        item !== null &&
        (item as Record<string, unknown>).checked === true &&
        isNonEmptyString((item as Record<string, unknown>).text)
    )
    .map(item => ((item as Record<string, unknown>).text as string).trim());

  if (selected.length === 0) {
    return null;
  }

  return allowMultiple ? selected.join(', ') : selected[0];
}

function getDateAnswerText(items: unknown): string | null {
  if (!Array.isArray(items)) {
    return null;
  }

  const valuesByName = new Map<string, string>();
  for (const item of items) {
    if (typeof item !== 'object' || item === null) {
      continue;
    }
    const name = (item as Record<string, unknown>).name;
    const value = (item as Record<string, unknown>).value;
    if (isNonEmptyString(name) && isNonEmptyString(value)) {
      valuesByName.set(name, value.trim());
    }
  }

  const ordered = ['day', 'month', 'year'].map(part => valuesByName.get(part)).filter(isNonEmptyString);
  return ordered.length > 0 ? ordered.join('/') : null;
}

function getAnswerTextFromField(field: RenderableField): string | null {
  if (!field.component || typeof field.component !== 'object') {
    return null;
  }

  const component = field.component;
  const value = component.value;

  if (field.componentType === 'radios') {
    return getSelectionAnswerText(component.items, false);
  }

  if (field.componentType === 'checkboxes') {
    return getSelectionAnswerText(component.items, true);
  }

  if (field.componentType === 'dateInput') {
    return getDateAnswerText(component.items);
  }

  return isNonEmptyString(value) ? value.trim() : null;
}

export function extractRowsFromFields(
  fields: unknown,
  stepSlug: string,
  sectionId: string,
  basePath: string,
  t: TFunction
): SummaryListItem[] {
  if (!Array.isArray(fields)) {
    return [];
  }

  return fields
    .map(field => field as RenderableField)
    .map(field => {
      const questionText = getQuestionTextFromField(field);
      const answerText = getAnswerTextFromField(field);
      if (!questionText || !answerText) {
        return null;
      }

      return {
        key: { text: questionText },
        value: { text: answerText },
        actions: {
          items: [
            {
              href: `${basePath}/${stepSlug}?returnToSectionCya=${encodeURIComponent(sectionId)}`,
              text: t('change', 'Change'),
              visuallyHiddenText: questionText,
            },
          ],
        },
      } satisfies SummaryListItem;
    })
    .filter((row): row is SummaryListItem => row !== null);
}
