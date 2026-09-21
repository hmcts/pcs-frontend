import type { RespondToClaimSectionEnum } from './sections.config';
import { sectionIdToBackendEnum } from './sections.config';

import type { PossessionClaimResponse } from '@services/ccdCase.interface';

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
