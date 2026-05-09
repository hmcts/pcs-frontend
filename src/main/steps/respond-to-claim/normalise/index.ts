import { cloneDeep } from 'lodash';

import type { Normaliser } from './Normaliser';
import { normaliseContactPreferences } from './normaliseContactPreferences';
import { normaliseCounterClaim } from './normaliseCounterClaim';
import { normaliseHouseholdFinance } from './normaliseHouseholdFinance';
import { normaliseNoticeDetails } from './normaliseNoticeDetails';
import { normaliseRepaymentAgreement } from './normaliseRepaymentAgreement';

import type { PossessionClaimResponse } from '@services/ccdCase.interface';

const normalisers: readonly Normaliser[] = [
  normaliseRepaymentAgreement,
  normaliseNoticeDetails,
  normaliseHouseholdFinance,
  normaliseContactPreferences,
  normaliseCounterClaim,
];

// Returns a new object — the input is never modified.
// Inside, each normaliser mutates a private working copy.
export function normaliseRespondToClaimDraft(response: PossessionClaimResponse): PossessionClaimResponse {
  const workingCopy = cloneDeep(response);
  for (const normalise of normalisers) {
    normalise(workingCopy);
  }
  return workingCopy;
}
