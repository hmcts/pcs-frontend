import path from 'path';

import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { createGetController } from '../controller';
import { createStepNavigation } from '../flow';
import { getTranslationFunction, loadStepNamespace } from '../i18n';

import { wireFileUploadUrls } from './fileUploadUtils';
import { getStaticBasePath, getStaticEntryStepId, resolveFormBuilderFlowConfig } from './flowConfig';
import { buildFormContent } from './formContent';
import { getFormData } from './helpers';
import { createPostHandler } from './postHandler';
import { validateConfigInDevelopment } from './schema';

import type { BuiltFormContent, FormBuilderConfig } from '@modules/steps/formBuilder/formFieldConfig.interface';
import type { JourneyFlowConfig } from '@modules/steps/stepFlow.interface';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { getDashboardUrl } from '@routes/dashboard';
import { type UploadValidationOptions, bytesToMb } from '@utils/documentUploadValidation';

export function applyUploadValidationToComponent(
  component: Record<string, unknown>,
  opts: UploadValidationOptions | undefined,
  t: TFunction
): void {
  if (!opts) {
    return;
  }
  if (opts.maxFilenameLength !== undefined) {
    component.maxFilenameLength = opts.maxFilenameLength;
    component.errorFilenameTooLong = t('common:errors.documentUpload.filenameTooLong', {
      maxLength: opts.maxFilenameLength,
    });
  }
  if (opts.maxDocumentBytes !== undefined) {
    const maxDocumentMB = bytesToMb(opts.maxDocumentBytes);
    component.maxDocumentMB = maxDocumentMB;
    component.errorFileTooLargeDocument = t('common:errors.documentUpload.fileTooLargeDocument', {
      maxSize: maxDocumentMB,
    });
  }
  if (opts.maxMediaBytes !== undefined) {
    const maxMediaMB = bytesToMb(opts.maxMediaBytes);
    component.maxMediaMB = maxMediaMB;
    component.errorFileTooLargeMedia = t('common:errors.documentUpload.fileTooLargeMedia', {
      maxSize: maxMediaMB,
    });
  }
}

export type { FormBuilderConfig } from '@modules/steps/formBuilder/formFieldConfig.interface';

function getPersistedFormDataFromResolvedConfig(
  req: Request,
  stepName: string,
  flowConfig: JourneyFlowConfig
): Record<string, unknown> {
  if (flowConfig?.useSessionFormData === false) {
    return {};
  }

  return getFormData(req, stepName);
}

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
    basePath: configuredBasePath,
    documentStorage,
    uploadValidation,
    isAnswered,
  } = config;

  if (!flowConfig) {
    throw new Error('flowConfig must be provided');
  }

  const journeyPath = camelToKebabCase(journeyFolder);
  const viewPath = customTemplate || 'formBuilder.njk';
  const basePath = getStaticBasePath(flowConfig, configuredBasePath || `/steps/${journeyPath}`);
  const stepNavigation = createStepNavigation(flowConfig);
  const stepUrl = getStaticEntryStepId(flowConfig) === stepName ? basePath : path.join(basePath, stepName);

  return {
    url: stepUrl,
    name: stepName,
    view: viewPath,
    stepDir,
    showCancelButton,
    documentStorage,
    uploadValidation,
    isAnswered,
    getController: () => {
      return createGetController(viewPath, stepName, stepNavigation, async req => {
        await loadStepNamespace(req);

        const t: TFunction = getTranslationFunction(req);

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
        const resolvedFlowConfig = await resolveFormBuilderFlowConfig(req, flowConfig);
        const formContent = buildFormContent(
          fields,
          t,
          initialFormData ?? getPersistedFormDataFromResolvedConfig(req, stepName, resolvedFlowConfig),
          {},
          translationKeys,
          nunjucksEnv,
          interpolationValues as Record<string, unknown>
        ) as BuiltFormContent;

        wireFileUploadUrls(formContent, req, documentStorage);
        if (documentStorage) {
          const fileField = formContent.fields?.find(f => f.componentType === 'fileUpload');
          if (fileField?.component) {
            applyUploadValidationToComponent(fileField.component, uploadValidation, t);
          }
        }

        const extraContent = extendGetContent ? await extendGetContent(req, formContent) : undefined;
        const result = extraContent ? { ...formContent, ...extraContent } : formContent;
        const navigationBackUrl = await stepNavigation.getBackUrl(req, stepName);
        const resultProps = result as Record<string, unknown>;
        const backUrl = typeof resultProps.backUrl === 'string' ? resultProps.backUrl : navigationBackUrl;
        return {
          ...result,
          ccdId: req.res?.locals.validatedCase?.id,
          caseReference: req.res?.locals.validatedCase?.id,
          dashboardUrl: getDashboardUrl(req.res?.locals.validatedCase?.id),
          stepName,
          journeyFolder,
          languageToggle: t('languageToggle'),
          backUrl,
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
      extendGetContent,
      documentStorage
    ),
  };
}
