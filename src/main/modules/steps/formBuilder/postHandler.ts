import type { NextFunction, Request, Response } from 'express';
import type { TFunction } from 'i18next';

import type {
  BuiltFormContent,
  ExtendGetContent,
  FormFieldConfig,
  TranslationKeys,
} from '../../../interfaces/formFieldConfig.interface';
import type { JourneyFlowConfig } from '../../../interfaces/stepFlow.interface';
import { getDashboardUrl } from '../../../routes/dashboard';
import { safeRedirect303 } from '../../../utils/safeRedirect';
import { createStepNavigation } from '../flow';
import { getTranslationFunction, loadStepNamespace } from '../i18n';

import { renderWithErrors } from './errorUtils';
import { translateFields } from './fieldTranslation';
import { handleFileUploadDelete, validateAndAppendFileUploads } from './fileUploadPostActions';
import { buildFormContent } from './formContent';
import {
  getCustomErrorTranslations,
  getFormData,
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
  flowConfig: JourneyFlowConfig,
  beforeRedirect?: (req: Request) => Promise<void> | void,
  translationKeys?: TranslationKeys,
  showCancelButton?: boolean,
  extendGetContent?: ExtendGetContent
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
  const stepNavigation = createStepNavigation(flowConfig);

  return {
    post: async (req: Request, res: Response, next: NextFunction) => {
      await loadStepNamespace(req, stepName, journeyFolder);

      const t: TFunction = getTranslationFunction(req, stepName, ['common']);
      const action = req.body.action as string | undefined;

      const nunjucksEnv = req.app.locals.nunjucksEnv;
      if (!nunjucksEnv) {
        throw new Error('Nunjucks environment not initialized');
      }

      const hasFileFields = fields.some(f => f.type === 'file');

      if (hasFileFields && typeof req.body.delete === 'string' && req.body.delete) {
        handleFileUploadDelete(req, stepName, fields, req.body.delete);
        safeRedirect303(res, req.originalUrl, '/', ['/']);
        return;
      }

      if (hasFileFields && req.body.fileUploadAction === 'add') {
        normalizeCheckboxFields(req, fields);
        const interpolationValuesEarly = extendGetContent ? await extendGetContent(req, { fields: [] } as BuiltFormContent) : {};
        const fieldErrorsEarly = getTranslationErrors(t, fields, undefined, interpolationValuesEarly);
        const errorsAdd = validateAndAppendFileUploads(req, stepName, fields, t, fieldErrorsEarly);

        if (Object.keys(errorsAdd).length > 0) {
          const mergeData = { ...getFormData(req, stepName), ...req.body };
          const formContent = buildFormContent(
            fields,
            t,
            mergeData,
            errorsAdd,
            translationKeys,
            nunjucksEnv,
            interpolationValuesEarly,
            showCancelButton
          );
          const extendedContent = extendGetContent ? await extendGetContent(req, formContent) : {};
          const fullContent = { ...formContent, ...extendedContent, hasFileFields: true };
          await renderWithErrors(
            req,
            res,
            viewPath,
            errorsAdd,
            fields,
            fullContent,
            stepName,
            journeyFolder,
            stepNavigation,
            translationKeys,
            showCancelButton
          );
          return;
        }

        safeRedirect303(res, req.originalUrl, '/', ['/']);
        return;
      }

      // Get all form data from session for cross-field validation
      const allFormData = req.session.formData
        ? Object.values(req.session.formData).reduce((acc, stepData) => ({ ...acc, ...stepData }), {})
        : {};

      // Normalize checkbox fields BEFORE validation to ensure checkbox values are arrays
      // This is critical because validation functions (like required functions) need normalized checkbox arrays
      // Note: We only normalize checkboxes here, NOT date fields, because date validation expects individual day/month/year keys
      normalizeCheckboxFields(req, fields);

      // Get interpolation values from extendGetContent if available (for dynamic translation values)
      const emptyFormContent = { fields: [] } as BuiltFormContent;
      const interpolationValues = extendGetContent ? await extendGetContent(req, emptyFormContent) : {};

      const fieldsWithLabels = translateFields(
        fields,
        t,
        {},
        {},
        false,
        '',
        undefined,
        nunjucksEnv,
        interpolationValues
      );
      const stepSpecificErrors = getCustomErrorTranslations(t, fieldsWithLabels);
      const fieldErrors = getTranslationErrors(t, fields, undefined, interpolationValues);
      const errors = validateForm(
        req,
        fieldsWithLabels,
        { ...fieldErrors, ...stepSpecificErrors },
        allFormData,
        t,
        stepName
      );

      if (Object.keys(errors).length > 0) {
        const mergeData = { ...getFormData(req, stepName), ...req.body };
        const formContent = buildFormContent(
          fields,

          t,

          mergeData,

          errors,

          translationKeys,

          nunjucksEnv,
          interpolationValues,
          showCancelButton
        );
        // Call extendGetContent to get additional translated content (buttons, labels, etc.)
        const extendedContent = extendGetContent ? await extendGetContent(req, formContent) : {};
        const fullContent = { ...formContent, ...extendedContent, hasFileFields };
        await renderWithErrors(
          req,
          res,
          viewPath,
          errors,
          fields,
          fullContent,
          stepName,
          journeyFolder,
          stepNavigation,
          translationKeys,
          showCancelButton
        );
        return; // renderWithErrors sends the response, so we return early
      }

      // Process field data (normalize checkboxes + consolidate date fields) before saving
      processFieldData(req, fields, stepName);
      const { action: _, ...bodyWithoutAction } = req.body;
      // Merge with existing session data so file-upload metadata (set during the
      // "add" action) is preserved when the user clicks "Save and Continue".
      const existingStepData = hasFileFields ? getFormData(req, stepName) : {};
      setFormData(req, stepName, { ...existingStepData, ...bodyWithoutAction });

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

      if (action === 'saveForLater') {
        const caseId = req.res?.locals.validatedCase?.id;
        const dashboardUrl = caseId ? getDashboardUrl(caseId) : null;

        if (!dashboardUrl) {
          // No valid case reference - redirect to home
          return safeRedirect303(res, '/', '/', ['/']);
        }

        return safeRedirect303(res, dashboardUrl, '/', ['/dashboard']);
      }

      const redirectPath = await stepNavigation.getNextStepUrl(req, stepName, bodyWithoutAction);
      if (!redirectPath) {
        return res.status(500).send('Unable to determine next step');
      }

      // Allow all internal paths since this is a generic form builder
      safeRedirect303(res, redirectPath, '/', ['/']);
    },
  };
}
