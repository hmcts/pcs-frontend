import path from 'path';

import type { Request } from 'express';
import type { TFunction } from 'i18next';
import type { BuiltFormContent, FormBuilderConfig, TranslationKeys } from '../../../interfaces/formFieldConfig.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { getDashboardUrl } from '../../../routes/dashboard';
import { createGetController } from '../controller';
import { createStepNavigation } from '../flow';
import { getTranslationFunction, loadStepNamespace } from '../i18n';

import { buildFormContent } from './formContent';
import { getFormData } from './helpers';
import { createPostHandler } from './postHandler';
import { validateConfigInDevelopment } from './schema';
import { concatenateJourneyStepName } from '@utils/stepNameFolderCombiner';
import { retrieveJourneyFolder } from '../journeyFolderRetriever';

export type { FormBuilderConfig } from '../../../interfaces/formFieldConfig.interface';


let defaultTranslationKeys: any;
let journeyFolder: string;

export function createFormStep(config: FormBuilderConfig): StepDefinition {
  // Validate config in development mode
  validateConfigInDevelopment(config);

  const {
    stepName,
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
  } = config;

  if (!flowConfig) {
    throw new Error('flowConfig must be provided');
  }

  const viewPath: string | ((req: Request) => string | Promise<string>) = customTemplate || 'formBuilder.njk';
  const basePath = flowConfig.basePath;
  const stepNavigation = createStepNavigation(flowConfig);

  return {
    url: path.join(basePath, stepName),
    name: stepName,
    view: viewPath,
    stepDir,
    showCancelButton,
    getController: () => {
      return createGetController(viewPath, stepName, stepNavigation, async req => {

        journeyFolder = retrieveJourneyFolder(req);

        if(translationKeys instanceof Map) {
          defaultTranslationKeys = getTranslationKeys(translationKeys, "professional");
        } else {
          defaultTranslationKeys = translationKeys;
        }

        await loadStepNamespace(req, stepName, journeyFolder);

        const t: TFunction = getTranslationFunction(req, stepName, ['common'], journeyFolder);

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
          initialFormData || getFormData(req, concatenateJourneyStepName(stepName, journeyFolder)),
          {},
          defaultTranslationKeys,
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
          backUrl: await stepNavigation.getBackUrl(req, stepName),
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
      flowConfig,
      beforeRedirect,
      defaultTranslationKeys,
      showCancelButton,
      extendGetContent
    ),
  };
}


function getTranslationKeys(translationKeysMap: Map<string, TranslationKeys>, key: string = "default") {
  if(translationKeysMap.has("default")) {
    return translationKeysMap.get("default");
  }
  return translationKeysMap.get(key);

}
