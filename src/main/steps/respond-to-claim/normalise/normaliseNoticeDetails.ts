import { normalizeYesNoValue } from '../../utils';

import type { PossessionClaimResponse } from '@services/ccdCase.interface';

export function normaliseNoticeDetails(response: PossessionClaimResponse): void {
  const dr = response.defendantResponses;
  if (!dr) {
    return;
  }

  // Notice not received → notice-date pages are skipped
  if (normalizeYesNoValue(dr.possessionNoticeReceived) !== 'YES') {
    delete dr.noticeReceivedDate;
  }
}
