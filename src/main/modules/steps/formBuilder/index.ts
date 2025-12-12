import path from 'path';

import type { TFunction } from 'i18next';

import { getDashboardUrl } from '../../../app/utils/routes';
import type { FormBuilderConfig } from '../../../interfaces/formFieldConfig.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createGetController } from '../controller';
import { stepNavigation } from '../flow';
import { getTranslationFunction, loadStepNamespace } from '../i18n';

import { buildFormContent } from './formContent';
import { getFormData } from './helpers';
import { createPostHandler } from './postHandler';

export type { FormBuilderConfig } from '../../../interfaces/formFieldConfig.interface';

/**
 * Converts camelCase to kebab-case (e.g., "userJourney" -> "user-journey")
 */
function camelToKebabCase(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

export function createFormStep(config: FormBuilderConfig): StepDefinition {
  const { stepName, journeyFolder, fields, beforeRedirect, extendGetContent, stepDir, translationKeys } = config;

  const journeyPath = camelToKebabCase(journeyFolder);
  const viewPath = 'formBuilder.njk';

  return {
    url: path.join('/steps', journeyPath, stepName),
    name: stepName,
    view: viewPath,
    stepDir,
    getController: () => {
      return createGetController(viewPath, stepName, async req => {
        await loadStepNamespace(req, stepName, journeyFolder);

        const t: TFunction = getTranslationFunction(req, stepName, ['common']);

        const formContent = buildFormContent(fields, t, getFormData(req, stepName), undefined, translationKeys);
        const result = extendGetContent ? { ...formContent, ...extendGetContent(req, {}) } : formContent;

        return {
          ...result,
          ccdId: req.session?.ccdCase?.id,
          dashboardUrl: getDashboardUrl(req.session?.ccdCase?.id),
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
