import type { TFunction } from 'i18next';

import type { FormFieldConfig, TranslationKeys } from '../../../interfaces/formFieldConfig.interface';

import { buildFieldValues, translateFields } from './fieldTranslation';
import { getTranslation } from './helpers';

export function buildFormContent(
  fields: FormFieldConfig[],
  t: TFunction,
  bodyData: Record<string, unknown> = {},
  error?: { field: string; anchor?: string; text: string },
  translationKeys?: TranslationKeys
): Record<string, unknown> {
  const fieldValues = buildFieldValues(fields, bodyData);
  const pageTitle = getTranslation(t, 'title', undefined) || getTranslation(t, 'question', undefined);
  const fieldsWithLabels = translateFields(fields, t, fieldValues, error, !!pageTitle);

  return {
    ...bodyData,
    fieldValues,
    fields: fieldsWithLabels,
    title: pageTitle,
    pageTitle: translationKeys?.pageTitle && t(translationKeys.pageTitle),
    content: translationKeys?.content && t(translationKeys.content),
    continue: t('buttons.continue'),
    saveForLater: t('buttons.saveForLater'),
    cancel: t('buttons.cancel'),
    errorSummaryTitle: t('errors.title'),
    serviceName: t('serviceName'),
    phase: t('phase'),
    feedback: t('feedback'),
    back: t('back'),
  };
}
