import type { NextFunction, Request, Response } from 'express';
import type { TFunction } from 'i18next';

import type { FormFieldConfig, TranslationKeys } from '../../../interfaces/formFieldConfig.interface';
import { DASHBOARD_ROUTE } from '../../../routes/dashboard';
import { stepNavigation } from '../flow';
import { getTranslationFunction, loadStepNamespace } from '../i18n';

import { renderWithErrors } from './errorUtils';
import { translateFields } from './fieldTranslation';
import { buildFormContent } from './formContent';
import { getTranslationErrors, processFieldData, setFormData, validateForm } from './helpers';
import { validateConfigInDevelopment } from './schema';

export function createPostHandler(
  fields: FormFieldConfig[],
  stepName: string,
  viewPath: string,
  journeyFolder: string,
  beforeRedirect?: (req: Request) => Promise<void> | void,
  translationKeys?: TranslationKeys
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

      const fieldsWithLabels = translateFields(fields, t, {}, {}, false, '', undefined, nunjucksEnv);
      // Use original fields for getTranslationErrors to ensure we get the raw errorMessage keys from subFields
      const errors = validateForm(req, fieldsWithLabels, getTranslationErrors(t, fields), allFormData);

      // If there are validation errors, show them regardless of action
      if (Object.keys(errors).length > 0) {
        const formContent = buildFormContent(fields, t, req.body, errors, translationKeys, nunjucksEnv);
        renderWithErrors(req, res, viewPath, errors, fields, formContent, stepName, journeyFolder, translationKeys);
        return; // renderWithErrors sends the response, so we return early
      }

      // Handle saveForLater action after validation passes
      if (action === 'saveForLater') {
        processFieldData(req, fields);
        const bodyWithoutAction = { ...req.body };
        delete bodyWithoutAction.action;
        setFormData(req, stepName, bodyWithoutAction);
        return res.redirect(303, DASHBOARD_ROUTE);
      }

      processFieldData(req, fields);
      const bodyWithoutAction = { ...req.body };
      delete bodyWithoutAction.action;
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
