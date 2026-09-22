import type { TFunction } from 'i18next';
import type { Environment } from 'nunjucks';

import { type FormError, buildErrorSummary } from './errorUtils';
import { buildFieldValues, translateFields } from './fieldTranslation';
import { getTranslation } from './helpers';

import { Logger } from '@modules/logger';
import type {
  BuiltFormContent,
  FormFieldConfig,
  TranslationKeys,
} from '@modules/steps/formBuilder/formFieldConfig.interface';

const logger = Logger.getLogger('form-builder-content');

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
  // Pass bodyData as originalData so translateFields can extract nested field values
  const fieldsWithLabels = translateFields(
    fields,

    t,

    fieldValues,

    errors,

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
        const translated = getTranslation(t, value, undefined, interpolation);
        if (translated !== undefined) {
          translatedContent[key] = translated;
        } else {
          logger.warn(
            `Missing translation for form content key "${key}" using translation key "${value}". Key will be omitted from template context.`
          );
        }
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
