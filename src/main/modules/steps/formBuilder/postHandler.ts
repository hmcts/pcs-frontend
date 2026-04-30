import type { NextFunction, Request, Response } from 'express';
import type { TFunction } from 'i18next';

import { buildSectionStatusPatch } from '../../../steps/respond-to-claim/utils/sectionStatusPatch';
import { getSectionForStep, isLastStepInSection } from '../../../steps/utils';
import { buildCcdCaseForPossessionClaimResponse } from '../../../steps/utils/populateResponseToClaimPayloadmap';
import { createStepNavigation } from '../flow';
import { getTranslationFunction, loadStepNamespace } from '../i18n';

import { renderWithErrors } from './errorUtils';
import { translateFields } from './fieldTranslation';
import { buildFormContent } from './formContent';
import {
  getCustomErrorTranslations,
  getTranslationErrors,
  normalizeCheckboxFields,
  processFieldData,
  setFormData,
  validateForm,
} from './helpers';
import { validateConfigInDevelopment } from './schema';

import type {
  BuiltFormContent,
  ExtendGetContent,
  FormFieldConfig,
  TranslationKeys,
} from '@modules/steps/formBuilder/formFieldConfig.interface';
import type { JourneyFlowConfig } from '@modules/steps/stepFlow.interface';
import { getDashboardUrl } from '@routes/dashboard';
import { safeRedirect303 } from '@utils/safeRedirect';

function shouldUseSessionFormData(flowConfig?: JourneyFlowConfig): boolean {
  return flowConfig?.useSessionFormData !== false;
}

function getStepSlugFromRedirectPath(redirectPath: string): string | null {
  const pathWithoutQuery = redirectPath.split('?')[0];
  if (!pathWithoutQuery) {
    return null;
  }

  const parts = pathWithoutQuery.split('/').filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : null;
}

function getSectionCyaUrl(flowConfig: JourneyFlowConfig, sectionId: string, caseId?: string): string {
  let basePath = flowConfig.basePath || '';
  if (caseId && basePath.includes(':caseReference')) {
    basePath = basePath.replace(':caseReference', caseId);
  }
  return `${basePath}/check-your-answers?section=${encodeURIComponent(sectionId)}`;
}

export function createPostHandler(
  fields: FormFieldConfig[],
  stepName: string,
  viewPath: string,
  journeyFolder: string,
  flowConfig: JourneyFlowConfig,
  beforeRedirect?: (req: Request) => Promise<void> | void,
  translationKeys?: TranslationKeys,
  showCancelButton?: boolean,
  extendGetContent?: ExtendGetContent
): { post: (req: Request, res: Response, next: NextFunction) => Promise<void | Response> } {
  // Validate config in development mode
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
  const stepNavigation = createStepNavigation(flowConfig);

  return {
    post: async (req: Request, res: Response, next: NextFunction) => {
      await loadStepNamespace(req, stepName, journeyFolder);

      const t: TFunction = getTranslationFunction(req, stepName, ['common']);
      const action = req.body.action as string | undefined;

      const nunjucksEnv = req.app.locals.nunjucksEnv;
      if (!nunjucksEnv) {
        throw new Error('Nunjucks environment not initialized');
      }

      const allFormData = shouldUseSessionFormData(flowConfig)
        ? req.session.formData
          ? Object.values(req.session.formData).reduce((acc, stepData) => ({ ...acc, ...stepData }), {})
          : {}
        : {};

      // Normalize checkbox fields BEFORE validation to ensure checkbox values are arrays
      // This is critical because validation functions (like required functions) need normalized checkbox arrays
      // Note: We only normalize checkboxes here, NOT date fields, because date validation expects individual day/month/year keys
      normalizeCheckboxFields(req, fields);

      // Get interpolation values from extendGetContent if available (for dynamic translation values)
      const emptyFormContent = { fields: [] } as BuiltFormContent;
      const interpolationValues = extendGetContent ? await extendGetContent(req, emptyFormContent) : {};

      const fieldsWithLabels = translateFields(
        fields,
        t,
        {},
        {},
        false,
        '',
        undefined,
        nunjucksEnv,
        interpolationValues
      );
      const stepSpecificErrors = getCustomErrorTranslations(t, fieldsWithLabels);
      const fieldErrors = getTranslationErrors(t, fields, undefined, interpolationValues);
      const errors = validateForm(req, fieldsWithLabels, { ...fieldErrors, ...stepSpecificErrors }, allFormData, t);

      if (Object.keys(errors).length > 0) {
        const formContent = buildFormContent(
          fields,

          t,

          req.body,

          errors,

          translationKeys,

          nunjucksEnv,
          interpolationValues,
          showCancelButton
        );
        // Call extendGetContent to get additional translated content (buttons, labels, etc.)
        const extendedContent = extendGetContent ? await extendGetContent(req, formContent) : {};
        const fullContent = { ...formContent, ...extendedContent };
        await renderWithErrors(
          req,
          res,
          viewPath,
          errors,
          fields,
          fullContent,
          stepName,
          journeyFolder,
          stepNavigation,
          translationKeys,
          showCancelButton
        );
        return; // renderWithErrors sends the response, so we return early
      }

      // Process field data (normalize checkboxes + consolidate date fields) before saving
      processFieldData(req, fields);
      const { action: _, ...bodyWithoutAction } = req.body;
      if (shouldUseSessionFormData(flowConfig)) {
        setFormData(req, stepName, bodyWithoutAction);
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

      if (action === 'saveForLater') {
        const caseId = req.res?.locals.validatedCase?.id;
        const dashboardUrl = caseId ? getDashboardUrl(caseId) : null;

        if (!dashboardUrl) {
          // No valid case reference - redirect to home
          return safeRedirect303(res, '/', '/', ['/']);
        }

        return safeRedirect303(res, dashboardUrl, '/', ['/dashboard']);
      }

      const redirectPath = await stepNavigation.getNextStepUrl(req, stepName, bodyWithoutAction);
      if (!redirectPath) {
        return res.status(500).send('Unable to determine next step');
      }

      const sections = flowConfig.sections;
      if (journeyFolder === 'respondToClaim' && sections) {
        const currentSectionId = getSectionForStep(stepName, sections);
        const nextStepSlug = getStepSlugFromRedirectPath(redirectPath);
        const query = req.query ?? {};
        const returnToSectionCya = typeof query.returnToSectionCya === 'string' ? query.returnToSectionCya : undefined;
        const caseId = req.res?.locals.validatedCase?.id;

        // For edits from a sectional CYA, stay in the section if routing changed,
        // otherwise jump back to the sectional CYA.
        if (
          returnToSectionCya &&
          currentSectionId &&
          returnToSectionCya === currentSectionId &&
          isLastStepInSection(stepName, nextStepSlug, sections)
        ) {
          const sectionCyaUrl = getSectionCyaUrl(flowConfig, currentSectionId, caseId);
          safeRedirect303(res, sectionCyaUrl, '/', ['/']);
          return;
        }

        if (
          currentSectionId &&
          currentSectionId !== 'checkYourAnswersAndSubmit' &&
          isLastStepInSection(stepName, nextStepSlug, sections)
        ) {
          const sectionCyaUrl = getSectionCyaUrl(flowConfig, currentSectionId, caseId);
          safeRedirect303(res, sectionCyaUrl, '/', ['/']);
          return;
        }

        if (
          returnToSectionCya &&
          currentSectionId &&
          returnToSectionCya === currentSectionId &&
          !isLastStepInSection(stepName, nextStepSlug, sections)
        ) {
          await buildCcdCaseForPossessionClaimResponse(req, buildSectionStatusPatch(currentSectionId, 'IN_PROGRESS'));
        }
      }

      // Allow all internal paths since this is a generic form builder
      safeRedirect303(res, redirectPath, '/', ['/']);
    },
  };
}
