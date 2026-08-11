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

  // Drop any stored mobile number once the defendant is no longer opted in to text messages,
  // so a stale number is not left behind on the party (e.g. text set to NO, or telephone
  // later changed to NO which also disables text).
  if (normalizeYesNoValue(dr.contactByText) !== 'YES') {
    const party = response.defendantContactDetails?.party;
    if (party) {
      delete party.textMessageNumber;
    }
  }
}
