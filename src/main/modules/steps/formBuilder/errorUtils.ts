import type { Request, Response } from 'express';
import type { TFunction } from 'i18next';

import type { FormFieldConfig, TranslationKeys } from '../../../interfaces/formFieldConfig.interface';
import { getDashboardUrl } from '../../../routes/dashboard';
import { getRequestLanguage } from '../../i18n';
import { getTranslationFunction } from '../i18n';

import type { DateFieldError } from './dateValidation';

export interface ErrorSummaryData {
  titleText: string;
  errorList: { text: string; href: string }[];
}

export type FormError = string | DateFieldError;

/**
 * Extracts the error message string from a FormError
 * @param error - FormError (string or DateFieldError)
 * @returns The error message string
 */
export function getErrorMessage(error: FormError): string {
  return typeof error === 'string' ? error : error.message;
}

/**
 * Builds an error summary object in GOV.UK Design System format
 * @param errors - Record of field names to error messages or date field error objects
 * @param fields - Array of form field configurations
 * @param t - Translation function
 * @returns ErrorSummaryData object or null if no errors
 */
export function buildErrorSummary(
  errors: Record<string, FormError>,
  fields: FormFieldConfig[],
  t: TFunction
): ErrorSummaryData | null {
  if (!errors || Object.keys(errors).length === 0) {
    return null;
  }

  const errorList: { text: string; href: string }[] = [];

  for (const [fieldName, error] of Object.entries(errors)) {
    const fieldConfig = fields.find(f => f.name === fieldName);
    const fieldType = fieldConfig?.type;

    // Extract error message and date part info
    const errorMessage = typeof error === 'string' ? error : error.message;
    const erroneousParts = typeof error === 'string' ? undefined : error.erroneousParts;

    // Determine the anchor ID for the error link
    let anchorId: string;
    if (fieldType === 'date') {
      // For date fields, use erroneous parts info if available
      if (erroneousParts && erroneousParts.length === 1) {
        // Single specific part error - anchor to that part
        anchorId = `${fieldName}-${erroneousParts[0]}`;
      } else {
        // Generic error or multiple parts - anchor to day
        anchorId = `${fieldName}-day`;
      }
    } else if (fieldType === 'radio' || fieldType === 'checkbox') {
      // Radio/checkbox fields anchor to the field name (group-level anchor)
      anchorId = fieldName;
    } else {
      // Other fields anchor to the field name
      anchorId = fieldName;
    }

    errorList.push({
      text: errorMessage,
      href: `#${anchorId}`,
    });
  }

  // If no errors to show in summary, return null
  if (errorList.length === 0) {
    return null;
  }

  const titleTranslation = t('errors.title');
  // Check if translation exists (not just the key itself)
  const titleText = titleTranslation && titleTranslation !== 'errors.title' ? titleTranslation : 'There is a problem';

  return {
    titleText,
    errorList,
  };
}

/**
 * Renders a form with errors using standardized error handling
 * @param req - Express request object
 * @param res - Express response object
 * @param viewPath - Path to the view template
 * @param errors - Record of field names to error messages
 * @param fields - Array of form field configurations
 * @param formContent - Form content object (will be enhanced with error summary)
 * @param stepName - Name of the current step
 * @param journeyFolder - Journey folder name
 * @param translationKeys - Optional translation keys
 * @returns Response object
 */
export async function renderWithErrors(
  req: Request,
  res: Response,
  viewPath: string,
  errors: Record<string, FormError>,
  fields: FormFieldConfig[],
  formContent: Record<string, unknown>,
  stepName: string,
  journeyFolder: string,
  navigation: { getBackUrl: (req: Request, currentStepName: string) => Promise<string | null> },
  _translationKeys?: TranslationKeys,
  showCancelButton?: boolean
): Promise<void> {
  const lang = getRequestLanguage(req);
  const t: TFunction = getTranslationFunction(req, stepName, ['common']);

  // formContent already includes errorSummary from buildFormContent, so we don't need to rebuild it
  // res.render() sends the response directly and doesn't return a value
  res.status(400).render(viewPath, {
    ...formContent,
    errors,
    // errorSummary,
    stepName,
    journeyFolder,
    backUrl: await navigation.getBackUrl(req, stepName),
    lang,
    pageUrl: req.originalUrl || '/',
    t,
    ccdId: req.session?.ccdCase?.id,
    dashboardUrl: getDashboardUrl(req.session?.ccdCase?.id),
    languageToggle: t('languageToggle'),
    showCancelButton,
  });
}
