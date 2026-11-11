import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { parseDraftVersion } from '../utils/buildDraftDefendantResponse';

import { answeredClaim, readClaim, saveClaimDraft } from './claimDraft';
import { claimMappings } from './claimMapping';
import { MAKE_A_CLAIM_JOURNEY, MAKE_A_CLAIM_ROUTE, flowConfig, taskListPath } from './flow.config';
import {
  type ReturnToStep,
  cardsReturningTo,
  isReturnToStep,
  returnToOf,
  stepNameOfUrl,
  withReturnTo,
} from './returnTo';
import { confirmationsAfterSave, confirmedCyas, confirmingCya, isSectionCya } from './sectionConfirmation';
import { SECTION_SUMMARY_STEPS, type SectionCya } from './sections.config';
import { draftChangedUrl, isDraftChanged } from './submitErrors';
import type { SummaryCard } from './summary';

import { createFormStep, getStepTranslations, getTranslationFunction } from '@modules/steps';
import { getNextStep, getStepUrl } from '@modules/steps/flow';
import type { BuiltFormContent, FormBuilderConfig } from '@modules/steps/formBuilder/formFieldConfig.interface';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CitizenPossessionClaim } from '@services/citizenPossessionClaim.interface';

export const caseReferenceOf = (req: Request): string => req.res?.locals.validatedCase?.id ?? '';

export const QUESTION_TEMPLATE = 'make-a-claim/templates/question.njk';

type MakeAClaimStepConfig = Omit<FormBuilderConfig, 'journeyFolder' | 'flowConfig' | 'basePath' | 'stepDir'> & {
  stepDir?: string;
  /** A page with nothing to answer: one Continue button and no Save for later. */
  interstitial?: boolean;
  /** Where to send a request the page cannot be shown for, such as one naming an item that does not exist. */
  redirectWhen?: (req: Request) => string | undefined | Promise<string | undefined>;
  /**
   * After a change from a summary page, whether the page's own next page is still asked before returning, as for a
   * new defendant's address. By default it is.
   */
  keepsOwnRedirectOnReturn?: (req: Request) => boolean;
};

/** Labels and links every make a claim page uses, so templates need no knowledge of the journey's routes. */
export function sharedPageContent(req: Request, interstitial = false): Record<string, unknown> {
  const t = getTranslationFunction(req, ['makeAClaim', 'common']);
  return {
    saveAndContinue: interstitial ? t('makeAClaim:buttons.continue') : t('makeAClaim:buttons.saveAndContinue'),
    saveForLater: interstitial ? undefined : t('makeAClaim:buttons.saveForLater'),
    cancel: t('makeAClaim:buttons.cancel'),
    dashboardUrl: req.res?.locals.validatedCase?.id ? taskListPath(req.res.locals.validatedCase.id) : '/',
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

/** Sends the request elsewhere when `redirectWhen` says the page cannot be shown for it. */
function redirectGuard(redirectWhen: NonNullable<MakeAClaimStepConfig['redirectWhen']>): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const redirect = await redirectWhen(req);
      if (redirect) {
        return res.redirect(303, redirect);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

/** Whether a page counts as answered for a return from a change: pages with nothing to answer always do. */
function stepIsAnswered(req: Request, stepName: string): boolean {
  const mapping = claimMappings[stepName];
  if (mapping?.isAnswered) {
    return mapping.isAnswered(readClaim(req), req);
  }
  return !mapping?.fromForm;
}

/** A page still to answer, at the item on it that is not yet answered when it asks about several. */
export function unansweredStepUrl(req: Request, stepName: string): string {
  const query = claimMappings[stepName]?.unansweredQuery?.(readClaim(req)) ?? '';
  return `${getStepUrl(stepName, flowConfig, caseReferenceOf(req))}${query}`;
}

const NOT_PAGE_TEXT = ['errors', 'error', 'fields', 'backUrl'];

/**
 * The step's own text, such as its page title and heading. A page shown again with errors is rendered from the
 * form alone, so it is added back for that render, under the form's own content as on a first render.
 */
function pageTextForErrors(req: Request, formContent: BuiltFormContent): Record<string, unknown> {
  if (req.method !== 'POST' || !isRendering(formContent)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(getStepTranslations(req)).filter(([key]) => !NOT_PAGE_TEXT.includes(key) && !(key in formContent))
  );
}

/**
 * Where Save and continue goes on a page opened from a summary page's Change link: back to that summary, unless
 * the change opened a question that still needs answering, which is asked first. The step's own next page, as
 * when adding a defendant, is kept, and it keeps returning to the summary too.
 */
async function returnAfterChange(
  req: Request,
  stepName: string,
  returnTo: ReturnToStep,
  ownRedirect: string | undefined
): Promise<string> {
  const caseReference = caseReferenceOf(req);
  const summaryUrl = getStepUrl(returnTo, flowConfig, caseReference);
  if (ownRedirect) {
    return isReturnToStep(stepNameOfUrl(ownRedirect)) ? summaryUrl : withReturnTo(ownRedirect, returnTo);
  }
  if (isReturnToStep(stepName)) {
    return summaryUrl;
  }
  let next = await getNextStep(req, stepName, flowConfig, {});
  while (next && !isReturnToStep(next) && flowConfig.sections?.some(section => section.steps.includes(next!))) {
    if (!stepIsAnswered(req, next)) {
      return withReturnTo(unansweredStepUrl(req, next), returnTo);
    }
    next = await getNextStep(req, next, flowConfig, {});
  }
  return summaryUrl;
}

/** Saves the claim, sending the claimant to the draft changed page when another tab saved first. */
async function saveFromPage(
  req: Request,
  claim: CitizenPossessionClaim,
  confirmedSections: readonly string[]
): Promise<void> {
  try {
    await saveClaimDraft(req, claim, confirmedSections);
  } catch (error) {
    if (!isDraftChanged(error)) {
      throw error;
    }
    req.res?.redirect(303, draftChangedUrl(req.res.locals.validatedCase?.id ?? ''));
  }
}

/** Continuing from a section's check your answers page confirms it; Save for later does not. */
async function confirmSection(req: Request, cya: SectionCya): Promise<void> {
  const saved = readClaim(req);
  if (req.body?.action === 'saveForLater' || confirmedCyas(saved).includes(cya)) {
    return;
  }
  await saveFromPage(
    req,
    answeredClaim(req, () => undefined),
    confirmingCya(saved, cya)
  );
}

/** Saves a page's answers, withdrawing the confirmation of the summary showing them when they changed. */
async function saveAnswers(req: Request, stepName: string, apply: (claim: CitizenPossessionClaim) => void) {
  const claim = answeredClaim(req, apply);
  await saveFromPage(req, claim, confirmationsAfterSave(readClaim(req), claim, stepName));
}

/**
 * A page of the make a claim journey. Its form carries the draft version it was shown with, which its save sends,
 * so a save after another tab's is refused. Its answers are read from and saved to the claim draft through the
 * page's entry in {@link claimMappings}, unless the page supplies its own.
 */
export function createMakeAClaimStep(config: MakeAClaimStepConfig): StepDefinition {
  const mapping = claimMappings[config.stepName];
  const isSummary = (SECTION_SUMMARY_STEPS as readonly string[]).includes(config.stepName);
  const sectionCya = isSectionCya(config.stepName) ? config.stepName : undefined;
  const { redirectWhen, keepsOwnRedirectOnReturn: keepsOwnRedirect, ...stepConfig } = config;
  const keepsOwnRedirectOnReturn = keepsOwnRedirect ?? (sectionCya ? () => false : undefined);
  const ownRedirectAfterPost =
    config.resolveRedirectAfterPost ??
    (isSummary ? async (req: Request) => taskListPath(caseReferenceOf(req)) : undefined);

  const step = createFormStep({
    customTemplate: QUESTION_TEMPLATE,
    stepDir: __dirname,
    getInitialFormData: mapping?.toForm ? req => mapping.toForm!(readClaim(req), req) : undefined,
    beforeRedirect: mapping?.fromForm
      ? req => saveAnswers(req, config.stepName, claim => mapping.fromForm!(claim, req.body ?? {}, req))
      : sectionCya
        ? req => confirmSection(req, sectionCya)
        : undefined,
    isAnswered: mapping?.isAnswered ? req => mapping.isAnswered!(readClaim(req), req) : undefined,
    ...stepConfig,
    resolveRedirectAfterPost: async (req: Request) => {
      const ownRedirect = (await ownRedirectAfterPost?.(req)) || undefined;
      const returnTo = returnToOf(req);
      if (!returnTo || returnTo === config.stepName) {
        return ownRedirect;
      }
      const keepOwn = ownRedirect && (keepsOwnRedirectOnReturn?.(req) ?? true);
      return returnAfterChange(req, config.stepName, returnTo, keepOwn ? ownRedirect : undefined);
    },
    extendGetContent: async (req: Request, formContent: BuiltFormContent) => {
      labelTextQuestionsAsPageHeading(formContent);
      const content: Record<string, unknown> = {
        ...pageTextForErrors(req, formContent),
        ...sharedPageContent(req, config.interstitial),
        ...(config.extendGetContent ? await config.extendGetContent(req, formContent) : {}),
      };
      if (isReturnToStep(config.stepName) && Array.isArray(content.cards)) {
        content.cards = cardsReturningTo(content.cards as SummaryCard[], config.stepName);
      }
      return content;
    },
    journeyFolder: MAKE_A_CLAIM_JOURNEY,
    basePath: MAKE_A_CLAIM_ROUTE,
    flowConfig,
  });

  if (!redirectWhen) {
    return step;
  }
  const guard = redirectGuard(redirectWhen);
  const post = step.postController?.post;
  return {
    ...step,
    middleware: [...(step.middleware ?? []), guard],
    postController: post
      ? { post: (req: Request, res: Response, next: NextFunction) => guard(req, res, () => post(req, res, next)) }
      : undefined,
  };
}
