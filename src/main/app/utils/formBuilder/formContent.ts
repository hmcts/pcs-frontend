import type { FormFieldConfig, TranslationKeys } from '../../../interfaces/formFieldConfig.interface';
import type { TranslationContent } from '../i18n';

import { buildFieldValues, translateFields } from './fieldTranslation';

export function buildFormContent(
  fields: FormFieldConfig[],
  content: TranslationContent,
  bodyData: Record<string, unknown> = {},
  error?: { field: string; text: string },
  translationKeys?: TranslationKeys
): Record<string, unknown> {
  // Build field values from saved data
  const fieldValues = buildFieldValues(fields, bodyData);

  // Determine if there's a page title
  const pageTitle = (content.title as string) || (content.question as string) || undefined;
  const hasTitle = !!pageTitle;

  // Translate fields and build component configs
  const fieldsWithLabels = translateFields(fields, content, fieldValues, error, hasTitle);

  // Extract page content
  const customPageTitle = translationKeys?.pageTitle
    ? (content[translationKeys.pageTitle] as string) || undefined
    : undefined;
  const pageContent = translationKeys?.content ? (content[translationKeys.content] as string) || undefined : undefined;

  // Extract button and error text
  const buttons = (content.buttons as Record<string, string>) || {};
  const errors = (content.errors as Record<string, string>) || {};

  return {
    ...bodyData,
    fieldValues,
    fields: fieldsWithLabels,
    title: pageTitle,
    pageTitle: customPageTitle,
    content: pageContent,
    continue: buttons.continue,
    saveForLater: buttons.saveForLater,
    cancel: buttons.cancel,
    errorSummaryTitle: errors.title,
  };
}
