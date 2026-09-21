import type { Request } from 'express';

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

/**
 * Remembers where the citizen entered Your Support from.
 */
export function rememberYourSupportOrigin(req: Request): void {
  if (!req.session) {
    return;
  }
  req.session.yourSupportReturnTo = req.query?.from === 'dashboard' ? 'dashboard' : 'task-list';
}

/**
 * The page Your Support returns to the recorded origin or falls back to
 * task-list / dashboard based on submission status.
 */
export function getYourSupportReturnUrl(req: Request): string | undefined {
  const caseReference = req.res?.locals.validatedCase?.id;
  if (!caseReference) {
    return undefined;
  }

  const origin: YourSupportOrigin =
    req.session?.yourSupportReturnTo ??
    (isDefendantResponseSubmitted(req.res?.locals.validatedCase?.data) ? 'dashboard' : 'task-list');

  if (origin === 'dashboard') {
    return getDashboardUrl(caseReference) ?? undefined;
  }
  return `${RESPOND_TO_CLAIM_ROUTE}/task-list`.replace(':caseReference', caseReference);
}
