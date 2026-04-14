import path from 'path';

import type { TFunction } from 'i18next';

import type { BuiltFormContent, FormBuilderConfig } from '../../../interfaces/formFieldConfig.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { getDashboardUrl } from '../../../routes/dashboard';
import { createGetController } from '../controller';
import { createStepNavigation } from '../flow';
import { getTranslationFunction, loadStepNamespace } from '../i18n';

import { multipartFormDataParser } from './fileUpload';
import { buildFormContent } from './formContent';
import { getFormData } from './helpers';
import { createPostHandler } from './postHandler';
import { validateConfigInDevelopment } from './schema';

export type { FormBuilderConfig } from '../../../interfaces/formFieldConfig.interface';

/**
 * Runs CSRF validation after multer has parsed the multipart body.
 * Global CSRF skips multipart requests because req.body is not yet available;
 * this middleware closes that gap.
 */
const csrfAfterMultipart: import('express').RequestHandler = (req, res, next) => {
  const csrfProtection = req.app.locals.csrfProtection as import('express').RequestHandler | undefined;
  if (csrfProtection) {
    csrfProtection(req, res, (err?: unknown) => {
      if (err) {
        return next(err);
      }
      if (typeof req.csrfToken === 'function') {
        res.locals.csrfToken = req.csrfToken();
      }
      next();
    });
    return;
  }
  next();
};

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
  } = config;

  if (!flowConfig) {
    throw new Error('flowConfig must be provided');
  }

  const journeyPath = camelToKebabCase(journeyFolder);
  const viewPath = customTemplate || 'formBuilder.njk';
  const basePath = flowConfig?.basePath || `/steps/${journeyPath}`;
  const stepNavigation = createStepNavigation(flowConfig);
  const hasFileUploadFields = fields.some(f => f.type === 'file');

  return {
    url: path.join(basePath, stepName),
    name: stepName,
    view: viewPath,
    stepDir,
    showCancelButton,
    postMiddleware: hasFileUploadFields ? [multipartFormDataParser, csrfAfterMultipart] : undefined,
    getController: () => {
      return createGetController(viewPath, stepName, stepNavigation, async req => {
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
        // Prefer session data (from user interactions like file uploads) over initial CCD data.
        // getInitialFormData is only used on the first visit when no session data exists yet.
        const sessionData = getFormData(req, stepName);
        const hasSessionData = Object.keys(sessionData).length > 0;
        const initialFormData = !hasSessionData && getInitialFormData ? await getInitialFormData(req) : undefined;
        const formContent = buildFormContent(
          fields,
          t,
          initialFormData || sessionData,
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
      translationKeys,
      showCancelButton,
      extendGetContent
    ),
  };
}
