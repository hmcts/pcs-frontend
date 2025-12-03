import type { Request, Response } from 'express';

import type { FormFieldConfig, TranslationKeys } from '../../../interfaces/formFieldConfig.interface';
import { setFormData, validateForm } from '../../controller/formHelpers';
import type { SupportedLang, TranslationContent } from '../i18n';
import { getValidatedLanguage } from '../i18n';
import { DASHBOARD_ROUTE, getDashboardUrl } from '../routes';
import { stepNavigation } from '../stepFlow';

import { translateFields } from './fieldTranslation';
import { buildFormContent } from './formContent';

export function createPostHandler(
  fields: FormFieldConfig[],
  stepName: string,
  viewPath: string,
  generateContent: (lang: SupportedLang) => TranslationContent,
  beforeRedirect?: (req: Request) => Promise<void> | void,
  translationKeys?: TranslationKeys
): { post: (req: Request, res: Response) => Promise<void | Response> } {
  return {
    post: async (req: Request, res: Response) => {
      const lang: SupportedLang = getValidatedLanguage(req);
      const content = generateContent(lang);
      const action = req.body.action as string | undefined;

      // Handle save for later
      if (action === 'saveForLater') {
        processFieldData(req, fields);
        const bodyWithoutAction = { ...req.body };
        delete bodyWithoutAction.action;
        setFormData(req, stepName, bodyWithoutAction);

        const ccdId = req.session?.ccdCase?.id;
        return res.redirect(303, getDashboardUrl(ccdId));
      }

      // Validate form
      const fieldsWithLabels = translateFields(fields, content, {}, undefined, false);
      const translationErrors = (content.errors as Record<string, string>) || {};
      const errors = validateForm(req, fieldsWithLabels, translationErrors);

      if (Object.keys(errors).length > 0) {
        const firstField = Object.keys(errors)[0];
        const error = { field: firstField, text: errors[firstField] };
        const formContent = buildFormContent(fields, content, req.body, error, translationKeys);

        const ccdId = req.session?.ccdCase?.id;
        return res.status(400).render(viewPath, {
          ...content,
          ...formContent,
          error,
          backUrl: stepNavigation.getBackUrl(req, stepName),
          lang,
          pageUrl: req.originalUrl || '/',
          t: req.t,
          ccdId,
          dashboardRoute: DASHBOARD_ROUTE,
        });
      }

      // Process field data for submission
      processFieldData(req, fields);

      const bodyWithoutAction = { ...req.body };
      delete bodyWithoutAction.action;

      setFormData(req, stepName, bodyWithoutAction);

      if (beforeRedirect) {
        await beforeRedirect(req);
        if (res.headersSent) {
          return;
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

function processFieldData(req: Request, fields: FormFieldConfig[]): void {
  for (const field of fields) {
    if (field.type === 'checkbox' && req.body[field.name]) {
      if (typeof req.body[field.name] === 'string') {
        req.body[field.name] = [req.body[field.name]];
      }
    } else if (field.type === 'date') {
      const day = req.body[`${field.name}-day`]?.trim() || '';
      const month = req.body[`${field.name}-month`]?.trim() || '';
      const year = req.body[`${field.name}-year`]?.trim() || '';

      req.body[field.name] = { day, month, year };
      delete req.body[`${field.name}-day`];
      delete req.body[`${field.name}-month`];
      delete req.body[`${field.name}-year`];
    }
  }
}
