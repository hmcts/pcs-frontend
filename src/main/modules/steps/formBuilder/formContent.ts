import type { TFunction } from 'i18next';
import type { Environment } from 'nunjucks';

import { type FormError, buildErrorSummary, getErrorMessage } from './errorUtils';
import { buildFieldValues, translateFields } from './fieldTranslation';
import { getTranslation } from './helpers';

import type {
  BuiltFormContent,
  FormFieldConfig,
  TranslationKeys,
} from '@modules/steps/formBuilder/formFieldConfig.interface';

export function buildFormContent(
  fields: FormFieldConfig[],
  t: TFunction,
  bodyData: Record<string, unknown> = {},
  errors: Record<string, FormError> = {},
  translationKeys?: TranslationKeys,
  nunjucksEnv?: Environment,
  interpolation?: Record<string, unknown>,
  showCancelButton: boolean = true
): BuiltFormContent {
  const fieldValues = buildFieldValues(fields, bodyData);
  const pageTitle =
    getTranslation(t, 'title', undefined, interpolation) || getTranslation(t, 'question', undefined, interpolation);
  // Convert FormError to string for translateFields (which expects strings for error messages)
  const stringErrors: Record<string, string> = Object.fromEntries(
    Object.entries(errors).map(([key, error]) => [key, getErrorMessage(error)])
  );
  // Pass bodyData as originalData so translateFields can extract nested field values
  const fieldsWithLabels = translateFields(
    fields,

    t,

    fieldValues,

    stringErrors,

    !!pageTitle,

    '',

    bodyData,

    nunjucksEnv,
    interpolation
  );

  // Build error summary
  const errorSummary = buildErrorSummary(errors, fields, t);

  // Process all translation keys dynamically
  const translatedContent: Record<string, unknown> = {};
  if (translationKeys) {
    for (const [key, value] of Object.entries(translationKeys)) {
      if (value) {
        translatedContent[key] = interpolation ? t(value, interpolation) : t(value);
      }
    }
  }

  const allFieldsHaveOwnFieldset = fields.length > 0 && fields.every(f => f.type === 'radio' || f.type === 'checkbox');

  return {
    ...bodyData,
    fieldValues,
    fields: fieldsWithLabels,
    allFieldsHaveOwnFieldset,
    title: pageTitle,
    ...translatedContent,
    showCancelButton,
    saveAndContinue: t('buttons.saveAndContinue'),
    continue: t('buttons.continue'),
    saveForLater: t('buttons.saveForLater'),
    cancel: t('buttons.cancel'),
    errorSummaryTitle: t('errors.title'),
    errorSummary,
    serviceName: t('serviceName'),
    phase: t('phase'),
    back: t('back'),
    contactUsForHelp: t('contactUsForHelp'),
    contactUsForHelpText: t('contactUsForHelpText'),
  };
}
