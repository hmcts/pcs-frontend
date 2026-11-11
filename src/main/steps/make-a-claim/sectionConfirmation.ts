import type { Request } from 'express';

import { answersChanged, readClaim } from './claimDraft';
import { SECTION_CYAS, type SectionCya, makeAClaimSections } from './sections.config';

import type { SectionConfig } from '@modules/steps/stepFlow.interface';
import type { CitizenPossessionClaim } from '@services/citizenPossessionClaim.interface';
import type { SectionConfirmation } from '@services/sectionStatus';

const ALL_SECTION_CYAS: readonly string[] = Object.values(SECTION_CYAS).flat();

/** Pages outside the task list's sections whose saves change the answers a check your answers page shows. */
const CHANGES_SHOWN_ON: Readonly<Record<string, SectionCya>> = {
  'remove-defendant': 'defendant-cya',
  'remove-ledger-entry': 'arrears-cya',
  'remove-rent-payment': 'arrears-cya',
};

export function isSectionCya(stepName: string): stepName is SectionCya {
  return ALL_SECTION_CYAS.includes(stepName);
}

export function sectionCyas(section: SectionConfig): readonly SectionCya[] {
  return (SECTION_CYAS as Partial<Record<string, readonly SectionCya[]>>)[section.id] ?? [];
}

/** The check your answers page that shows a page's answers: the first one after the page in its section. */
export function cyaShowing(stepName: string): SectionCya | undefined {
  if (CHANGES_SHOWN_ON[stepName]) {
    return CHANGES_SHOWN_ON[stepName];
  }
  for (const section of makeAClaimSections) {
    const index = section.steps.indexOf(stepName);
    if (index !== -1) {
      return section.steps.slice(index).find(isSectionCya);
    }
  }
  return undefined;
}

export function confirmedCyas(claim: CitizenPossessionClaim): string[] {
  return claim.confirmedSections ?? [];
}

/** The confirmations once the claimant continues from a check your answers page. */
export function confirmingCya(saved: CitizenPossessionClaim, cya: SectionCya): string[] {
  return [...new Set([...confirmedCyas(saved), cya])];
}

/**
 * The confirmations once a page's answers are saved: a change to them withdraws the confirmation of the check your
 * answers page that shows them, so the claimant confirms it again. A save that changes nothing keeps it.
 */
export function confirmationsAfterSave(
  saved: CitizenPossessionClaim,
  updated: CitizenPossessionClaim,
  stepName: string
): string[] {
  const cya = cyaShowing(stepName);
  const confirmed = confirmedCyas(saved);
  if (!cya || !answersChanged(saved, updated)) {
    return confirmed;
  }
  return confirmed.filter(name => name !== cya);
}

/** The first of a section's check your answers pages the claimant has not continued from. */
export function unconfirmedCya(section: SectionConfig, req: Request): SectionCya | undefined {
  const confirmed = confirmedCyas(readClaim(req));
  return sectionCyas(section).find(cya => !confirmed.includes(cya));
}

/** A make a claim section is done once every question is answered and every one of its summaries confirmed. */
export const makeAClaimSectionConfirmation: SectionConfirmation = {
  hasCya: section => sectionCyas(section).length > 0,
  isConfirmed: (section, req) => unconfirmedCya(section, req) === undefined,
  confirmationCompletes: false,
};
