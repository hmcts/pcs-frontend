import type { PossessionClaimResponse } from '@services/ccdCase.interface';

export type SectionStatus = 'IN_PROGRESS' | 'COMPLETED';

export function buildSectionStatusPatch(sectionId: string, status: SectionStatus): PossessionClaimResponse {
  return {
    defendantResponses: {
      sectionStatuses: [{ value: { sectionId, status } }],
    },
  };
}
