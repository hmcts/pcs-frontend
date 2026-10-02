import { normalizeYesNoValue } from '../../utils';

import type { PossessionClaimResponse } from '@services/ccdCase.interface';

export function normaliseContactPreferences(response: PossessionClaimResponse): void {
  const dr = response.defendantResponses;
  if (!dr) {
    return;
  }

  // Text message step is only reachable when a phone number was collected (contactByPhone === 'YES').
  // If the user changes their telephone answer to NO, contactByText becomes stale.
  if (normalizeYesNoValue(dr.contactByPhone) !== 'YES') {
    delete dr.contactByText;
  }

  // Note: the stale mobile number (party.textMessageNumber) is cleared by the BE in
  // ClaimResponseService.saveContactPreferences whenever the defendant is not opted in to
  // text. Normalisers must not touch party contact-detail fields — the BE rebuilds those from
  // PartyEntity on every START callback, so clearing them here would be a no-op.
}
