import path from 'path';

import type { Request } from 'express';
import type { TFunction } from 'i18next';

import type { BuiltFormContent, FormBuilderConfig } from '../../../interfaces/formFieldConfig.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { autoSaveToCCD } from '../../../middleware/autoSaveDraftToCCD';
import { getDashboardUrl } from '../../../routes/dashboard';
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
    beforeGet,
    extendGetContent,
    getInitialFormData,
    stepDir,
    translationKeys,
    flowConfig,
    showCancelButton,
    customTemplate,
    ccdMapping,
  } = config;

  const journeyPath = camelToKebabCase(journeyFolder);
  const viewPath = customTemplate || 'formBuilder.njk';
  const basePath = flowConfig?.basePath || `/steps/${journeyPath}`;
  const navigation = flowConfig ? createStepNavigation(flowConfig) : stepNavigation;

  const enhancedBeforeRedirect = ccdMapping
    ? async (req: Request) => {
        // Auto-save runs first to ensure CCD has latest data before any custom logic
        if (req.res) {
          await autoSaveToCCD(req, req.res, { stepName, ccdMapping });
        }
        // Then run your custom beforeRedirect if you provided one
        if (beforeRedirect) {
          await beforeRedirect(req);
        }
      }
    : beforeRedirect;

  return {
    url: path.join(basePath, stepName),
    name: stepName,
    view: viewPath,
    stepDir,
    showCancelButton,
    getController: () => {
      return createGetController(viewPath, stepName, async req => {
        await loadStepNamespace(req, stepName, journeyFolder);

        const t: TFunction = getTranslationFunction(req, stepName, ['common']);

        const nunjucksEnv = req.app.locals.nunjucksEnv;
        if (!nunjucksEnv) {
          throw new Error('Nunjucks environment not initialized');
        }
        if (beforeGet) {
          await beforeGet(req);
        }

        // Get interpolation values from extendGetContent if available (for dynamic translation values)
        const emptyFormContent = { fields: [] } as BuiltFormContent;
        const interpolationValues = extendGetContent ? await extendGetContent(req, emptyFormContent) : {};
        const initialFormData = getInitialFormData ? await getInitialFormData(req) : undefined;
        const formContent = buildFormContent(
          fields,
          t,
          initialFormData || getFormData(req, stepName),
          {},
          translationKeys,
          nunjucksEnv,
          interpolationValues as Record<string, unknown>
        ) as BuiltFormContent;
        const extraContent = extendGetContent ? await extendGetContent(req, formContent) : undefined;
        const result = extraContent ? { ...formContent, ...extraContent } : formContent;
        return {
          ...result,
          ccdId: req.res?.locals.validatedCase?.id,
          caseReference: req.res?.locals.validatedCase?.id,
          dashboardUrl: getDashboardUrl(req.res?.locals.validatedCase?.id),
          stepName,
          journeyFolder,
          languageToggle: t('languageToggle'),
          backUrl: await navigation.getBackUrl(req, stepName),
          showCancelButton,
          url: req.originalUrl, // Form action URL - POST to current page
        };
      });
    },
    postController: createPostHandler(
      fields,
      stepName,
      viewPath,
      journeyFolder,
      enhancedBeforeRedirect,
      translationKeys,
      flowConfig,
      showCancelButton,
      extendGetContent
    ),
  };
}
