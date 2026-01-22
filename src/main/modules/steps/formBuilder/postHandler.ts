import type { NextFunction, Request, Response } from 'express';
import type { TFunction } from 'i18next';

import type { FormFieldConfig, TranslationKeys } from '../../../interfaces/formFieldConfig.interface';
import { DASHBOARD_ROUTE } from '../../../routes/dashboard';
import { stepNavigation } from '../flow';
import { getTranslationFunction, loadStepNamespace } from '../i18n';

import { renderWithErrors } from './errorUtils';
import { translateFields } from './fieldTranslation';
import { buildFormContent } from './formContent';
import {
  getCustomErrorTranslations,
  getTranslationErrors,
  normalizeCheckboxFields,
  processFieldData,
  setFormData,
  validateForm,
} from './helpers';
import { validateConfigInDevelopment } from './schema';

export function createPostHandler(
  fields: FormFieldConfig[],
  stepName: string,
  viewPath: string,
  journeyFolder: string,
  beforeRedirect?: (req: Request) => Promise<void> | void,
  translationKeys?: TranslationKeys,
  extendGetContent?: (req: Request, content: Record<string, unknown>) => Record<string, unknown>
): { post: (req: Request, res: Response, next: NextFunction) => Promise<void | Response> } {
  // Validate config in development mode
  if (process.env.NODE_ENV !== 'production') {
    validateConfigInDevelopment({
      stepName,
      journeyFolder,
      fields,
      beforeRedirect,
      stepDir: '',
      translationKeys,
    });
  }

  return {
    post: async (req: Request, res: Response, next: NextFunction) => {
      await loadStepNamespace(req, stepName, journeyFolder);

      const t: TFunction = getTranslationFunction(req, stepName, ['common']);
      const action = req.body.action as string | undefined;

      const nunjucksEnv = req.app.locals.nunjucksEnv;
      if (!nunjucksEnv) {
        throw new Error('Nunjucks environment not initialized');
      }

      // Get all form data from session for cross-field validation
      const allFormData = req.session.formData
        ? Object.values(req.session.formData).reduce((acc, stepData) => ({ ...acc, ...stepData }), {})
        : {};

      // Normalize checkbox fields BEFORE validation to ensure checkbox values are arrays
      // This is critical because validation functions (like required functions) need normalized checkbox arrays
      // Note: We only normalize checkboxes here, NOT date fields, because date validation expects individual day/month/year keys
      normalizeCheckboxFields(req, fields);

      const fieldsWithLabels = translateFields(fields, t, {}, {}, false, '', undefined, nunjucksEnv);
      const stepSpecificErrors = getCustomErrorTranslations(t, fieldsWithLabels);
      const fieldErrors = getTranslationErrors(t, fieldsWithLabels);
      const errors = validateForm(req, fieldsWithLabels, { ...fieldErrors, ...stepSpecificErrors }, allFormData, t);

      if (Object.keys(errors).length > 0) {
        const formContent = buildFormContent(fields, t, req.body, errors, translationKeys, nunjucksEnv);
        // Call extendGetContent to get additional translated content (buttons, labels, etc.)
        const extendedContent = extendGetContent ? extendGetContent(req, formContent) : {};
        const fullContent = { ...formContent, ...extendedContent };
        renderWithErrors(req, res, viewPath, errors, fields, fullContent, stepName, journeyFolder, translationKeys);
        return; // renderWithErrors sends the response, so we return early
      }

      // Handle saveForLater action after validation passes
      if (action === 'saveForLater') {
        // Process field data (normalize checkboxes + consolidate date fields) before saving
        processFieldData(req, fields);
        const { action: _, ...bodyWithoutAction } = req.body;
        setFormData(req, stepName, bodyWithoutAction);
        return res.redirect(303, DASHBOARD_ROUTE);
      }

      // Process field data (normalize checkboxes + consolidate date fields) before saving
      processFieldData(req, fields);
      const { action: _, ...bodyWithoutAction } = req.body;
      setFormData(req, stepName, bodyWithoutAction);

      if (beforeRedirect) {
        try {
          await beforeRedirect(req);
          if (res.headersSent) {
            return;
          }
        } catch (error) {
          return next(error);
        }
      }

      const redirectPath = stepNavigation.getNextStepUrl(req, stepName, bodyWithoutAction);
      if (!redirectPath) {
        return res.status(500).send('Unable to determine next step');
      }

      res.redirect(303, redirectPath);
    },
  };
}
