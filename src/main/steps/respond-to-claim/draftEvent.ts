import type { CcdDraftEvent } from '@modules/documents/storage';

export const RESPOND_TO_CLAIM_DRAFT_EVENT: CcdDraftEvent = {
  id: 'respondPossessionClaim',
  pageId: 'respondToPossessionDraftSavePage',
} as const;
