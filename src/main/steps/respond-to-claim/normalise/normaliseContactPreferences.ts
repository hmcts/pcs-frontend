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
}
