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
  translationKeys?: TranslationKeys
): { post: (req: Request, res: Response, next: NextFunction) => Promise<void | Response> } {
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

      const allFormData = req.session.formData
        ? Object.values(req.session.formData).reduce((acc, stepData) => ({ ...acc, ...stepData }), {})
        : {};

      const fieldsWithLabels = translateFields(fields, t, {}, {}, false);
      const stepSpecificErrors = getCustomErrorTranslations(t, fieldsWithLabels);
      const fieldErrors = getTranslationErrors(t, fieldsWithLabels);
      const translations = { ...fieldErrors, ...stepSpecificErrors };
      const errors = validateForm(req, fieldsWithLabels, translations, allFormData, t);

      if (Object.keys(errors).length > 0) {
        const formContent = buildFormContent(fields, t, req.body, errors, translationKeys);
        renderWithErrors(req, res, viewPath, errors, fields, formContent, stepName, journeyFolder, translationKeys);
        return;
      }

      processFieldData(req, fields);
      const bodyWithoutAction = { ...req.body };
      delete bodyWithoutAction.action;
      setFormData(req, stepName, bodyWithoutAction);

      if (action === 'saveForLater') {
        return res.redirect(303, DASHBOARD_ROUTE);
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

      const redirectPath = stepNavigation.getNextStepUrl(req, stepName, bodyWithoutAction);
      if (!redirectPath) {
        return res.status(500).send('Unable to determine next step');
      }

      res.redirect(303, redirectPath);
    },
  };
}
