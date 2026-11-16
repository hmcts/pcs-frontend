import type { Request, RequestHandler } from 'express';

import { getUserType } from '../utils';

import { flowConfig } from './flow.config';
import { CYA_STEP_PREFIX, type RespondToClaimSectionId, findSectionIdForStep, sectionById } from './sections.config';
import { stepRegistry } from './stepRegistry';

import { Logger } from '@modules/logger';
import { getStepUrl } from '@modules/steps/flow';
import type { SectionConfig } from '@modules/steps/stepFlow.interface';
import { getAllSectionStatuses, getFirstVisibleStep, safeIsAnswered } from '@services/sectionStatus';
import { shouldShowStep } from '@steps';
import { isRespondToClaimEnabledForRelease } from '@utils/isRespondToClaimEnabledForUser';
import { safeRedirect303 } from '@utils/safeRedirect';

const logger = Logger.getLogger('respondToClaimAccessGuard');

// Reached by redirect after final submit or back from GOV.UK Pay. Submitting clears the draft, so the
// section no longer reads as available, showConditions that read the response (e.g. makeCounterClaim)
// are false and the URL carries no navigation marker — these pages bypass the guard.
const POST_SUBMISSION_STEPS: ReadonlySet<string> = new Set([
  'response-submitted',
  'response-and-counter-claim-submitted',
  'response-submitted-counter-claim-fee-payment-needed',
  'counter-claim-application-fee-amount',
  'counter-claim-payment-successful',
]);

export function respondToClaimAccessGuard(): RequestHandler {
  return async (req: Request, res, next) => {
    if (shouldSkipGuard(req)) {
      return next();
    }

    const hubStepName = flowConfig.hubStepName;
    if (!hubStepName) {
      return next();
    }

    // Express routes match case-insensitively and with a trailing slash, so normalise before lookup.
    const stepName = req.path.replace(/\/+$/, '').split('/').pop()?.toLowerCase();
    if (!stepName || stepName === hubStepName) {
      return next();
    }

    const caseId = req.res?.locals.validatedCase?.id;
    if (!caseId) {
      return next();
    }

    if (req.query.cyaReturn) {
      req.session.returnToCya = `/case/${caseId}/respond-to-claim/end-of-journey-cya?nav=1`;
    }

    const hubUrl = getStepUrl(hubStepName, flowConfig, caseId);
    const sectionId = findSectionIdForStep(stepName);

    try {
      if (POST_SUBMISSION_STEPS.has(stepName)) {
        return next();
      }

      // The guard runs before the per-step respondToClaimFeatureMiddleware, which is what normally sets
      // this flag; showConditions such as exempt-landlord read it.
      const locals = req.res?.locals;
      if (locals && locals.release12Enabled === undefined) {
        locals.release12Enabled = await isRespondToClaimEnabledForRelease(req);
      }

      if (sectionId && (await isSectionUnavailable(sectionId, req))) {
        return safeRedirect303(res, hubUrl, '/', ['/case/']);
      }

      if (!shouldShowStep(req, stepName, flowConfig)) {
        return safeRedirect303(res, hubUrl, '/', ['/case/']);
      }

      if (sectionId && isCyaStep(stepName)) {
        const redirectTarget = getCyaRedirectIfBlocked(sectionId, caseId, hubUrl, req);
        if (redirectTarget) {
          return safeRedirect303(res, redirectTarget, hubUrl, ['/case/']);
        }
      }

      // Direct entry is allowed only to a section's first visible step.
      if (sectionId && shouldRedirectToFirstVisibleStep(sectionId, stepName, req)) {
        const section = sectionById.get(sectionId);
        const firstVisibleStep = section && getFirstVisibleStep(section, flowConfig, req);
        if (firstVisibleStep) {
          return safeRedirect303(res, getStepUrl(firstVisibleStep, flowConfig, caseId), hubUrl, ['/case/']);
        }
      }

      return next();
    } catch (err) {
      logger.warn(`accessGuard predicate threw for ${stepName}, failing closed to hub`, err);
      return safeRedirect303(res, hubUrl, '/', ['/case/']);
    }
  };
}

function shouldSkipGuard(req: Request): boolean {
  return req.method !== 'GET' || getUserType(req) === 'legalrep';
}

function isCyaStep(stepName: string): boolean {
  return stepName.startsWith(CYA_STEP_PREFIX);
}

// A citizen may directly open only a section's first visible step. Any other
// step requires an internal-navigation marker: ?nav=1 (Back / Save and
// continue), ?edit= (CYA "Change" links), ?lang= (the in-page Cymraeg /
// English toggle, which reloads the current page in the other language), or
// ?submitError= / ?draftChanged= (final submit returning to end-of-journey-cya).
const INTERNAL_NAVIGATION_PARAMS = ['edit', 'nav', 'lang', 'submitError', 'draftChanged'] as const;

function shouldRedirectToFirstVisibleStep(sectionId: RespondToClaimSectionId, stepName: string, req: Request): boolean {
  if (INTERNAL_NAVIGATION_PARAMS.some(param => req.query[param] !== undefined)) {
    return false;
  }
  const section = sectionById.get(sectionId);
  if (!section) {
    return false;
  }
  const firstVisibleStep = getFirstVisibleStep(section, flowConfig, req);
  return firstVisibleStep !== undefined && stepName !== firstVisibleStep;
}

async function isSectionUnavailable(sectionId: RespondToClaimSectionId, req: Request): Promise<boolean> {
  const statuses = await getAllSectionStatuses(flowConfig, stepRegistry, req);
  const status = statuses.get(sectionId);
  return status === 'NOT_AVAILABLE_YET' || status === 'NOT_APPLICABLE';
}

function getCyaRedirectIfBlocked(
  sectionId: RespondToClaimSectionId,
  caseId: string,
  hubUrl: string,
  req: Request
): string | undefined {
  const section = sectionById.get(sectionId);
  if (!section) {
    return undefined;
  }
  // Sections with no countable question steps (e.g. uploadFiles, where every step is optional)
  // reach the CYA via the happy-path Save and continue. Don't bounce them back to the first step;
  // the citizen confirms the empty section by clicking Save and continue on the CYA itself.
  if (!sectionHasCountableSteps(section) || sectionHasAnyAnswer(section, req)) {
    return undefined;
  }
  const firstStep = getFirstVisibleStep(section, flowConfig, req);
  return firstStep ? `/case/${caseId}/respond-to-claim/${firstStep}` : hubUrl;
}

function sectionHasCountableSteps(section: SectionConfig): boolean {
  return section.steps.some(stepName => {
    const def = stepRegistry[stepName as keyof typeof stepRegistry];
    return def?.isAnswered !== undefined;
  });
}

// Only visible steps count, matching the task-list status: some hidden steps report isAnswered
// as always true (e.g. regular income/expenses before finance details are given).
function sectionHasAnyAnswer(section: SectionConfig, req: Request): boolean {
  return section.steps.some(stepName => {
    const def = stepRegistry[stepName as keyof typeof stepRegistry];
    return def && shouldShowStep(req, stepName, flowConfig) ? safeIsAnswered(def, req) : false;
  });
}
