import { PAY_CLAIM_FEE_ROUTE, makeAClaimPath } from '../../constants/makeAClaimRoutes';

import { flowConfig } from './flow.config';

import { getStepUrl } from '@modules/steps/flow';
import { ccdCaseService } from '@services/ccdCaseService';

/** The state a private landlord claim is in until it is submitted. */
export const AWAITING_SUBMISSION = 'AWAITING_SUBMISSION_TO_HMCTS';

/** The claim's case state, or undefined when the case cannot be read. */
export async function caseStateOf(accessToken: string, caseReference: string): Promise<string | undefined> {
  try {
    return (await ccdCaseService.getCaseById(accessToken, caseReference)).state;
  } catch {
    return undefined;
  }
}

/**
 * Where to send a claimant whose request failed because the claim was submitted already, for example by a second
 * click on Submit: to its fee, which itself moves on to the confirmation once paid. Undefined while it is a draft.
 */
export async function submittedClaimRedirect(accessToken: string, caseReference: string): Promise<string | undefined> {
  const state = await caseStateOf(accessToken, caseReference);
  return state && state !== AWAITING_SUBMISSION ? makeAClaimPath(PAY_CLAIM_FEE_ROUTE, caseReference) : undefined;
}

export function taskListPath(caseReference: string): string {
  return getStepUrl('task-list', flowConfig, caseReference);
}
