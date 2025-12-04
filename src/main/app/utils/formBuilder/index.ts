import type { TFunction } from 'i18next';

import type { FormBuilderConfig } from '../../../interfaces/formFieldConfig.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createGetController } from '../../controller/controllerFactory';
import { getStepNamespace, loadStepNamespace } from '../i18n';
import { DASHBOARD_ROUTE } from '../routes';
import { stepNavigation } from '../stepFlow';

import { buildFormContent } from './formContent';
import { getFormData, getLanguage } from './helpers';
import { createPostHandler } from './postHandler';

export type { FormBuilderConfig } from '../../../interfaces/formFieldConfig.interface';

export function createFormStep(config: FormBuilderConfig): StepDefinition {
  const { stepName, journeyFolder, fields, beforeRedirect, extendGetContent, stepDir, translationKeys } = config;

  const journeyPath = journeyFolder.replace(/([A-Z])/g, '-$1').toLowerCase();
  const viewPath = 'formBuilder.njk';

  return {
    url: `/steps/${journeyPath}/${stepName}`,
    name: stepName,
    view: viewPath,
    stepDir,
    getController: () => {
      return createGetController(viewPath, stepName, async req => {
        await loadStepNamespace(req, stepName, journeyFolder);

        const lang = getLanguage(req);
        const t: TFunction =
          req.i18n?.getFixedT(lang, [getStepNamespace(stepName), 'common']) || req.t || ((key: string) => key);

        const formContent = buildFormContent(fields, t, getFormData(req, stepName), undefined, translationKeys);
        const result = extendGetContent ? { ...formContent, ...extendGetContent(req, {}) } : formContent;

        return {
          ...result,
          ccdId: req.session?.ccdCase?.id,
          dashboardRoute: DASHBOARD_ROUTE,
          stepName,
          journeyFolder,
          languageToggle: t('languageToggle'),
          backUrl: stepNavigation.getBackUrl(req, stepName),
        };
      });
    },
    postController: createPostHandler(fields, stepName, viewPath, journeyFolder, beforeRedirect, translationKeys),
  };
}
