import type { NextFunction, Request, Response } from 'express';
import type { TFunction } from 'i18next';

import { createStepNavigation } from '../flow';
import { getTranslationFunction, loadStepNamespace } from '../i18n';

import { renderWithErrors } from './errorUtils';
import { translateFields } from './fieldTranslation';
import { type FormBuilderFlowConfig, resolveFormBuilderFlowConfig } from './flowConfig';
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

import { type DocumentStorage, toDisplayDocuments } from '@modules/documents/storage';
import type {
  BuiltFormContent,
  ExtendGetContent,
  FormFieldConfig,
  TranslationKeys,
} from '@modules/steps/formBuilder/formFieldConfig.interface';
import type { JourneyFlowConfig } from '@modules/steps/stepFlow.interface';
import { getDashboardUrl } from '@routes/dashboard';
import { safeRedirect303 } from '@utils/safeRedirect';

function shouldUseSessionFormData(flowConfig?: JourneyFlowConfig): boolean {
  return flowConfig?.useSessionFormData !== false;
}

export function createPostHandler(
  fields: FormFieldConfig[],
  stepName: string,
  viewPath: string,
  journeyFolder: string,
  flowConfig: FormBuilderFlowConfig,
  beforeRedirect?: (req: Request) => Promise<void> | void,
  translationKeys?: TranslationKeys,
  showCancelButton?: boolean,
  extendGetContent?: ExtendGetContent,
  documentStorage?: DocumentStorage
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
  const stepNavigation = createStepNavigation(req => resolveFormBuilderFlowConfig(req, flowConfig));

  return {
    post: async (req: Request, res: Response, next: NextFunction) => {
      await loadStepNamespace(req);

      const t: TFunction = getTranslationFunction(req);
      const action = req.body.action as string | undefined;

      const nunjucksEnv = req.app.locals.nunjucksEnv;
      if (!nunjucksEnv) {
        throw new Error('Nunjucks environment not initialized');
      }

      const resolvedFlowConfig = await resolveFormBuilderFlowConfig(req, flowConfig);

      const allFormData = shouldUseSessionFormData(resolvedFlowConfig)
        ? req.session.formData
          ? Object.values(req.session.formData).reduce((acc, stepData) => ({ ...acc, ...stepData }), {})
          : {}
        : {};

      // Normalize checkbox fields BEFORE validation to ensure checkbox values are arrays
      // This is critical because validation functions (like required functions) need normalized checkbox arrays
      // Note: We only normalize checkboxes here, NOT date fields, because date validation expects individual day/month/year keys
      normalizeCheckboxFields(req, fields);

      // For file fields backed by documentStorage, the form body's `uploadedDocuments[]`
      // hidden inputs are a UI mirror only — session is the source of truth. Hydrate
      // req.body[field.name] from storage so required-validation and the error re-render
      // both see actual upload state. Empty -> undefined so the standard isMissing check
      // fires; non-empty -> display documents so the macro repopulates the file list.
      if (documentStorage) {
        for (const field of fields) {
          if (field.type === 'file') {
            const docs = await documentStorage.read(req);
            req.body[field.name] = docs.length > 0 ? toDisplayDocuments(docs) : undefined;
          }
        }
      }

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
      const errors = validateForm(req, fieldsWithLabels, { ...fieldErrors, ...stepSpecificErrors }, allFormData, t);

      if (Object.keys(errors).length > 0) {
        const formContent = buildFormContent(
          fields,

          t,

          req.body,

          errors,

          translationKeys,

          nunjucksEnv,
          interpolationValues,
          showCancelButton
        );
        // Mirror the GET controller's auto-wiring of upload/delete URLs onto the fileUpload
        // component. Without this, the error re-render emits empty data-upload-url/data-delete-url,
        // which causes multi-file-upload.ts:initContainer to bail before MOJ's JS upgrade runs —
        // so the no-JS "Upload file" fallback button stays visible and async upload doesn't fire
        // on file selection.
        if (documentStorage) {
          const urlBase = req.originalUrl.split('?')[0];
          const fileField = formContent.fields?.find(f => f.componentType === 'fileUpload');
          if (fileField?.component) {
            fileField.component.uploadUrl = `${urlBase}/upload`;
            fileField.component.deleteUrl = `${urlBase}/delete`;
          }
        }
        // Call extendGetContent to get additional translated content (buttons, labels, etc.)
        const extendedContent = extendGetContent ? await extendGetContent(req, formContent) : {};
        const fullContent = { ...formContent, ...extendedContent };
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
      processFieldData(req, fields);
      const { action: _, ...bodyWithoutAction } = req.body;
      if (shouldUseSessionFormData(resolvedFlowConfig)) {
        setFormData(req, stepName, bodyWithoutAction);
      }

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
