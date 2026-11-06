import type { Request } from 'express';

import { parseDraftVersion } from '../utils/buildDraftDefendantResponse';

import { answeredClaim, readClaim, saveClaimDraft } from './claimDraft';
import { claimMappings } from './claimMapping';
import { MAKE_A_CLAIM_JOURNEY, MAKE_A_CLAIM_ROUTE, flowConfig } from './flow.config';
import { SECTION_SUMMARY_STEPS } from './sections.config';
import { draftChangedUrl, isDraftChanged } from './submitErrors';

import { createFormStep, getTranslationFunction } from '@modules/steps';
import { getStepUrl } from '@modules/steps/flow';
import type { BuiltFormContent, FormBuilderConfig } from '@modules/steps/formBuilder/formFieldConfig.interface';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const QUESTION_TEMPLATE = 'make-a-claim/templates/question.njk';

type MakeAClaimStepConfig = Omit<FormBuilderConfig, 'journeyFolder' | 'flowConfig' | 'basePath' | 'stepDir'> & {
  stepDir?: string;
  /** A page with nothing to answer: one Continue button and no Save for later. */
  interstitial?: boolean;
};

export function taskListUrl(req: Request): string {
  return getStepUrl('task-list', flowConfig, req.res?.locals.validatedCase?.id);
}

/** Labels and links every make a claim page uses, so templates need no knowledge of the journey's routes. */
export function sharedPageContent(req: Request, interstitial = false): Record<string, unknown> {
  const t = getTranslationFunction(req, ['makeAClaim', 'common']);
  return {
    saveAndContinue: interstitial ? t('makeAClaim:buttons.continue') : t('makeAClaim:buttons.saveAndContinue'),
    saveForLater: interstitial ? undefined : t('makeAClaim:buttons.saveForLater'),
    cancel: t('makeAClaim:buttons.cancel'),
    dashboardUrl: req.res?.locals.validatedCase?.id ? taskListUrl(req) : '/',
    signedIn: Boolean(req.session?.user),
    contactUsForHelp: t('contactUsForHelp'),
    draftVersion:
      req.method === 'POST'
        ? parseDraftVersion(req.body?.draftVersion)
        : req.res?.locals.validatedCase?.data?.citizenPossessionClaim?.draftVersion,
  };
}

/**
 * Whether the page is being rendered. The form builder first asks a step's extendGetContent for interpolation
 * values with a bare `{ fields: [] }`, including on a POST that goes on to redirect, so content only a rendered
 * page shows is built when the built form is passed.
 */
export function isRendering(formContent: BuiltFormContent): boolean {
  return 'allFieldsHaveOwnFieldset' in formContent;
}

/** The form builder only lets choice and date questions be the page heading; text inputs need it set here. */
function labelTextQuestionsAsPageHeading(formContent: BuiltFormContent): void {
  for (const field of formContent.fields ?? []) {
    const label = field.component?.label as Record<string, unknown> | undefined;
    if (field.isPageHeading && field.componentType === 'input' && label) {
      label.isPageHeading = true;
      label.classes = 'govuk-label--l';
    }
  }
}

/**
 * A page of the make a claim journey. Its form carries the draft version it was shown with, which its save sends,
 * so a save after another tab's is refused. Its answers are read from and saved to the claim draft through the
 * page's entry in {@link claimMappings}, unless the page supplies its own.
 */
export function createMakeAClaimStep(config: MakeAClaimStepConfig): StepDefinition {
  const mapping = claimMappings[config.stepName];
  const isSummary = (SECTION_SUMMARY_STEPS as readonly string[]).includes(config.stepName);

  return createFormStep({
    customTemplate: QUESTION_TEMPLATE,
    stepDir: __dirname,
    getInitialFormData: mapping?.toForm ? req => mapping.toForm!(readClaim(req), req) : undefined,
    beforeRedirect: mapping?.fromForm
      ? async req => {
          try {
            await saveClaimDraft(
              req,
              answeredClaim(req, claim => mapping.fromForm!(claim, req.body ?? {}, req))
            );
          } catch (error) {
            if (!isDraftChanged(error)) {
              throw error;
            }
            req.res?.redirect(303, draftChangedUrl(req.res.locals.validatedCase?.id ?? ''));
          }
        }
      : undefined,
    isAnswered: mapping?.isAnswered ? req => mapping.isAnswered!(readClaim(req), req) : undefined,
    resolveRedirectAfterPost: isSummary ? async req => taskListUrl(req) : undefined,
    ...config,
    extendGetContent: async (req: Request, formContent: BuiltFormContent) => {
      labelTextQuestionsAsPageHeading(formContent);
      return {
        ...sharedPageContent(req, config.interstitial),
        ...(config.extendGetContent ? await config.extendGetContent(req, formContent) : {}),
      };
    },
    journeyFolder: MAKE_A_CLAIM_JOURNEY,
    basePath: MAKE_A_CLAIM_ROUTE,
    flowConfig,
  });
}
