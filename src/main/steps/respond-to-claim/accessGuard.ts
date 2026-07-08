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

const logger = Logger.getLogger('respondToClaimAccessGuard');

export function respondToClaimAccessGuard(): RequestHandler {
  return async (req: Request, res, next) => {
    if (shouldSkipGuard(req)) {
      return next();
    }

    const hubStepName = flowConfig.hubStepName;
    if (!hubStepName) {
      return next();
    }

    const stepName = req.path.split('/').pop();
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
      if (sectionId && (await isSectionUnavailable(sectionId, req))) {
        return res.redirect(303, hubUrl);
      }

      if (!shouldShowStep(req, stepName, flowConfig)) {
        return res.redirect(303, hubUrl);
      }

      if (sectionId && isCyaStep(stepName)) {
        const redirectTarget = getCyaRedirectIfBlocked(sectionId, caseId, hubUrl, req);
        if (redirectTarget) {
          return res.redirect(303, redirectTarget);
        }
      }

      // Direct entry is allowed only to a section's first visible step.
      if (sectionId && shouldRedirectToFirstVisibleStep(sectionId, stepName, req)) {
        const section = sectionById.get(sectionId);
        const firstVisibleStep = section && getFirstVisibleStep(section, flowConfig, req);
        if (firstVisibleStep) {
          return res.redirect(303, getStepUrl(firstVisibleStep, flowConfig, caseId));
        }
      }

      return next();
    } catch (err) {
      logger.warn(`accessGuard predicate threw for ${stepName}, failing closed to hub`, err);
      return res.redirect(303, hubUrl);
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
// continue), ?edit= (CYA "Change" links), or ?lang= (the in-page Cymraeg /
// English toggle, which reloads the current page in the other language).
function shouldRedirectToFirstVisibleStep(sectionId: RespondToClaimSectionId, stepName: string, req: Request): boolean {
  if (req.query.edit !== undefined || req.query.nav !== undefined || req.query.lang !== undefined) {
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

function sectionHasAnyAnswer(section: SectionConfig, req: Request): boolean {
  return section.steps.some(stepName => {
    const def = stepRegistry[stepName as keyof typeof stepRegistry];
    return def ? safeIsAnswered(def, req) : false;
  });
}
