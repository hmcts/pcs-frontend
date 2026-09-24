import type { Request } from 'express';

import { RESPOND_TO_CLAIM_TASK_LIST_ROUTE } from '../../constants/caseRoutes';

import { RESPOND_TO_CLAIM_ROUTE } from './flow.config';
import type { RespondToClaimSectionEnum } from './sections.config';
import { sectionIdToBackendEnum } from './sections.config';

import { getDashboardUrl } from '@routes/dashboard';
import type { PossessionClaimResponse } from '@services/ccdCase.interface';
import { isDefendantResponseSubmitted } from '@services/ccdCaseData.model';

/** Backend enum value pcs-api stores for the Your Support task-list section. */
export const YOUR_SUPPORT_SECTION_ENUM: RespondToClaimSectionEnum = sectionIdToBackendEnum('yourSupport');

/**
 * Marks Your Support complete.
 */
export function addYourSupportToCompletedSections(
  completed: readonly RespondToClaimSectionEnum[] | undefined
): RespondToClaimSectionEnum[] {
  const current = completed ?? [];

  if (current.includes(YOUR_SUPPORT_SECTION_ENUM)) {
    return [...current];
  }

  return [...current, YOUR_SUPPORT_SECTION_ENUM];
}

export function isYourSupportSectionComplete(response: PossessionClaimResponse | undefined): boolean {
  return Boolean(response?.defendantResponses?.completedSections?.includes(YOUR_SUPPORT_SECTION_ENUM));
}

export type YourSupportOrigin = 'dashboard' | 'task-list';

const YOUR_SUPPORT_ORIGINS: readonly YourSupportOrigin[] = ['dashboard', 'task-list'];
const TRIAGE_STEP = 'reasonable-adjustments-triage';

function isYourSupportOrigin(value: unknown): value is YourSupportOrigin {
  return typeof value === 'string' && (YOUR_SUPPORT_ORIGINS as readonly string[]).includes(value);
}

/**
 * Remembers where the citizen entered Your Support from. Both entry links say so explicitly
 * (`?from=dashboard` on the dashboard row, `?from=task-list` on the task-list row). A triage GET
 * without `from` — the language toggle, a reload, the error page's retry — leaves the recorded origin
 * alone. Kept per case reference so tabs on different cases cannot interfere with each other.
 */
export function rememberYourSupportOrigin(req: Request): void {
  const origin = req.query?.from;
  const caseReference = req.res?.locals.validatedCase?.id;
  if (!req.session || !caseReference || !isYourSupportOrigin(origin)) {
    return;
  }

  req.session.yourSupportReturnTo = { ...req.session.yourSupportReturnTo, [caseReference]: origin };
}

// The recorded origin for this case, or, when nothing was recorded (a deep link straight to an outcome
// page), the task list before the response is submitted and the dashboard after.
function resolveYourSupportOrigin(req: Request, caseReference: string): YourSupportOrigin {
  return (
    req.session?.yourSupportReturnTo?.[caseReference] ??
    (isDefendantResponseSubmitted(req.res?.locals.validatedCase?.data) ? 'dashboard' : 'task-list')
  );
}

/**
 * The page Your Support returns to (back link, "I do not need any support", and the Continue and Save
 * for later buttons on the confirmation and cancelled pages). Undefined only when no case reference is
 * available.
 */
export function getYourSupportReturnUrl(req: Request): string | undefined {
  const caseReference = req.res?.locals.validatedCase?.id;
  if (!caseReference) {
    return undefined;
  }

  if (resolveYourSupportOrigin(req, caseReference) === 'dashboard') {
    return getDashboardUrl(caseReference) ?? undefined;
  }
  return RESPOND_TO_CLAIM_TASK_LIST_ROUTE.replace(':caseReference', caseReference);
}

/**
 * The triage URL carrying the current origin, for links that re-enter Your Support mid-journey (the
 * error page's "Try again"), so the origin survives the detour.
 */
export function getYourSupportTriageUrl(req: Request): string | undefined {
  const caseReference = req.res?.locals.validatedCase?.id;
  if (!caseReference) {
    return undefined;
  }

  const origin = resolveYourSupportOrigin(req, caseReference);
  return `${RESPOND_TO_CLAIM_ROUTE}/${TRIAGE_STEP}?from=${origin}`.replace(':caseReference', caseReference);
}
