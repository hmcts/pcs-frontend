import type { Request, Response } from 'express';
import type { TFunction } from 'i18next';

import type { FormFieldConfig, TranslationKeys } from '../../../interfaces/formFieldConfig.interface';
import { getRequestLanguage, getTranslationFunction, loadStepNamespace } from '../i18n';
import { DASHBOARD_ROUTE, getDashboardUrl } from '../routes';
import { stepNavigation } from '../stepFlow';

import { translateFields } from './fieldTranslation';
import { buildFormContent } from './formContent';
import { getTranslationErrors, processFieldData, setFormData, validateForm } from './helpers';

export function createPostHandler(
  fields: FormFieldConfig[],
  stepName: string,
  viewPath: string,
  journeyFolder: string,
  beforeRedirect?: (req: Request) => Promise<void> | void,
  translationKeys?: TranslationKeys
): { post: (req: Request, res: Response) => Promise<void | Response> } {
  return {
    post: async (req: Request, res: Response) => {
      await loadStepNamespace(req, stepName, journeyFolder);

      const lang = getRequestLanguage(req);
      const t: TFunction = getTranslationFunction(req, stepName, ['common']);
      const action = req.body.action as string | undefined;

      const fieldsWithLabels = translateFields(fields, t, {}, undefined, false);
      const errors = validateForm(req, fieldsWithLabels, getTranslationErrors(t, fieldsWithLabels));

      // If there are validation errors, show them regardless of action
      if (Object.keys(errors).length > 0) {
        const firstField = Object.keys(errors)[0];
        const error = { field: firstField, text: errors[firstField] };
        const formContent = buildFormContent(fields, t, req.body, error, translationKeys);

        return res.status(400).render(viewPath, {
          ...formContent,
          error,
          stepName,
          journeyFolder,
          backUrl: stepNavigation.getBackUrl(req, stepName),
          lang,
          pageUrl: req.originalUrl || '/',
          t,
          ccdId: req.session?.ccdCase?.id,
          dashboardRoute: DASHBOARD_ROUTE,
          languageToggle: t('languageToggle'),
        });
      }

      // Handle saveForLater action after validation passes
      if (action === 'saveForLater') {
        processFieldData(req, fields);
        const bodyWithoutAction = { ...req.body };
        delete bodyWithoutAction.action;
        setFormData(req, stepName, bodyWithoutAction);
        return res.redirect(303, getDashboardUrl(req.session?.ccdCase?.id));
      }

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
