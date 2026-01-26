import path from 'path';

import type { TFunction } from 'i18next';

import type { FormBuilderConfig } from '../../../interfaces/formFieldConfig.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { DASHBOARD_ROUTE } from '../../../routes/dashboard';
import { createGetController } from '../controller';
import { createStepNavigation, stepNavigation } from '../flow';
import { getTranslationFunction, loadStepNamespace } from '../i18n';

import { buildFormContent } from './formContent';
import { getFormData } from './helpers';
import { createPostHandler } from './postHandler';
import { validateConfigInDevelopment } from './schema';

export type { FormBuilderConfig } from '../../../interfaces/formFieldConfig.interface';

/**
 * Converts camelCase to kebab-case (e.g., "respondToClaim" -> "respond-to-claim")
 */
function camelToKebabCase(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

export function createFormStep(config: FormBuilderConfig): StepDefinition {
  // Validate config in development mode
  validateConfigInDevelopment(config);

  const {
    stepName,
    journeyFolder,
    fields,
    beforeRedirect,
    extendGetContent,
    stepDir,
    translationKeys,
    flowConfig,
    customTemplate,
  } = config;

  const journeyPath = camelToKebabCase(journeyFolder);
  const viewPath = customTemplate || 'formBuilder.njk';
  const basePath = flowConfig?.basePath || `/steps/${journeyPath}`;
  const navigation = flowConfig ? createStepNavigation(flowConfig) : stepNavigation;

  return {
    url: path.join(basePath, stepName),
    name: stepName,
    view: viewPath,
    stepDir,
    getController: () => {
      return createGetController(viewPath, stepName, async req => {
        await loadStepNamespace(req, stepName, journeyFolder);

        const t: TFunction = getTranslationFunction(req, stepName, ['common']);

        const nunjucksEnv = req.app.locals.nunjucksEnv;
        if (!nunjucksEnv) {
          throw new Error('Nunjucks environment not initialized');
        }
        const formContent = buildFormContent(fields, t, getFormData(req, stepName), {}, translationKeys, nunjucksEnv);
        const result = extendGetContent ? { ...formContent, ...extendGetContent(req, {}) } : formContent;

        return {
          ...result,
          ccdId: req.session?.ccdCase?.id,
          caseReference: req.params.caseReference,
          dashboardUrl: DASHBOARD_ROUTE,
          stepName,
          journeyFolder,
          languageToggle: t('languageToggle'),
          backUrl: await navigation.getBackUrl(req, stepName),
        };
      });
    },
    postController: createPostHandler(
      fields,
      stepName,
      viewPath,
      journeyFolder,
      beforeRedirect,
      translationKeys,
      flowConfig,
      extendGetContent
    ),
  };
}
