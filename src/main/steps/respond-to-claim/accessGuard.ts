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
  return async (req, res, next) => {
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
  if (!section || sectionHasAnyAnswer(section, req)) {
    return undefined;
  }
  const firstStep = getFirstVisibleStep(section, flowConfig, req);
  return firstStep ? `/case/${caseId}/respond-to-claim/${firstStep}` : hubUrl;
}

function sectionHasAnyAnswer(section: SectionConfig, req: Request): boolean {
  return section.steps.some(stepName => {
    const def = stepRegistry[stepName as keyof typeof stepRegistry];
    return def ? safeIsAnswered(def, req) : false;
  });
}
