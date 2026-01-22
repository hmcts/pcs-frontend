import type { TFunction } from 'i18next';
import type { Environment } from 'nunjucks';

import type { FormFieldConfig, TranslationKeys } from '../../../interfaces/formFieldConfig.interface';

import { buildErrorSummary } from './errorUtils';
import { buildFieldValues, translateFields } from './fieldTranslation';
import { getTranslation } from './helpers';

export function buildFormContent(
  fields: FormFieldConfig[],
  t: TFunction,
  bodyData: Record<string, unknown> = {},
  errors: Record<string, string> = {},
  translationKeys?: TranslationKeys,
  nunjucksEnv?: Environment
): Record<string, unknown> {
  const fieldValues = buildFieldValues(fields, bodyData);
  const pageTitle = getTranslation(t, 'title', undefined) || getTranslation(t, 'question', undefined);
  // Pass bodyData as originalData so translateFields can extract nested field values
  const fieldsWithLabels = translateFields(fields, t, fieldValues, errors, !!pageTitle, '', bodyData, nunjucksEnv);

  // Build error summary
  const errorSummary = buildErrorSummary(errors, fields, t);

  // Process all translation keys dynamically
  const translatedContent: Record<string, unknown> = {};
  if (translationKeys) {
    for (const [key, value] of Object.entries(translationKeys)) {
      if (value) {
        translatedContent[key] = t(value);
      }
    }
  }

  return {
    ...bodyData,
    fieldValues,
    fields: fieldsWithLabels,
    title: pageTitle,
    ...translatedContent,
    continue: t('buttons.continue'),
    saveForLater: t('buttons.saveForLater'),
    cancel: t('buttons.cancel'),
    errorSummaryTitle: t('errors.title'),
    errorSummary,
    serviceName: t('serviceName'),
    phase: t('phase'),
    feedback: t('feedback'),
    back: t('back'),
    contactUsForHelp: t('contactUsForHelp'),
    contactUsForHelpText: t('contactUsForHelpText'),
  };
}
