/**
 * Shared CCD final-submit for respond-to-claim (citizen).
 *
 * Used by the end-of-journey CYA step (after SOT validation) and the legacy
 * POST /case/:caseReference/final-submit route.
 */
import config from 'config';
import type { Request } from 'express';

import { getCounterClaimAmountInPence } from './counterClaimAmount';
import { getRespondToClaimSubmitNavigation } from './postSubmissionRouting';

import { http } from '@modules/http';
import { Logger } from '@modules/logger';
import type { CcdCase, PossessionClaimResponse } from '@services/ccdCase.interface';
import { persistPaymentSessionState } from '@services/paymentSessionService';

const logger = Logger.getLogger('respondToClaimFinalSubmit');

export const RESPOND_TO_CLAIM_POST_SUBMIT_REDIRECT_SESSION_KEY = 'respondToClaimPostSubmitRedirect';

export function getEndOfJourneyCyaSubmitErrorPath(caseId: string): string {
  return `/case/${caseId}/respond-to-claim/end-of-journey-cya?submitError=failed`;
}

export class RespondToClaimFinalSubmitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RespondToClaimFinalSubmitError';
  }
}

/** Error code pcs-api puts at the front of its callback error when the draft changed after review (HDPI-8866 W05). */
export const DRAFT_CHANGED_ERROR_CODE = 'DRAFT_CHANGED';

/** The stored draft moved on after the review page rendered: nothing was persisted, review and consent again. */
export class RespondToClaimDraftChangedError extends Error {
  constructor(message = 'Draft changed after review') {
    super(message);
    this.name = 'RespondToClaimDraftChangedError';
  }
}

export function getEndOfJourneyCyaDraftChangedPath(caseId: string): string {
  return `/case/${caseId}/respond-to-claim/end-of-journey-cya?draftChanged=1`;
}

/**
 * True for the draft-changed rejection whichever layer surfaced it: our own typed error, an HTTPError built by
 * ccdCaseService from the mid-event callback errors, or a raw axios error from the CCD submit call.
 */
export function isDraftChangedError(error: unknown): boolean {
  if (error instanceof RespondToClaimDraftChangedError) {
    return true;
  }
  if (error instanceof Error && error.message.includes(DRAFT_CHANGED_ERROR_CODE)) {
    return true;
  }
  const responseData = (error as { response?: { data?: { callbackErrors?: unknown; errors?: unknown } } })?.response
    ?.data;
  const messages = [responseData?.callbackErrors, responseData?.errors]
    .flatMap(value => (Array.isArray(value) ? value : []))
    .filter((value): value is string => typeof value === 'string');
  return messages.some(message => message.startsWith(DRAFT_CHANGED_ERROR_CODE));
}

interface ParsedSubmitPaymentPayload {
  serviceRequestReference: string;
  feeAmount?: number;
  counterClaimType?: string;
}

export function parseSubmitPaymentPayload(confirmationBody?: string | null): ParsedSubmitPaymentPayload | undefined {
  if (!confirmationBody) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(confirmationBody) as {
      counterClaim?: {
        serviceRequestReference?: unknown;
        feeAmount?: unknown;
        claimType?: unknown;
      };
      serviceRequestReference?: unknown;
      feeAmount?: unknown;
      claimType?: unknown;
    };
    const paymentDetails = parsed.counterClaim ?? parsed;

    if (
      typeof paymentDetails.serviceRequestReference !== 'string' ||
      paymentDetails.serviceRequestReference.trim().length === 0
    ) {
      return undefined;
    }

    const claimType =
      typeof paymentDetails.claimType === 'string' && paymentDetails.claimType.trim().length > 0
        ? paymentDetails.claimType
        : undefined;

    return {
      serviceRequestReference: paymentDetails.serviceRequestReference,
      feeAmount: typeof paymentDetails.feeAmount === 'number' ? paymentDetails.feeAmount : undefined,
      counterClaimType: claimType,
    };
  } catch (error) {
    logger.warn('Unable to parse submit confirmation body JSON for payment payload', error);
    return undefined;
  }
}

function getBaseUrl(): string {
  return config.get('ccd.url');
}

function getCaseHeaders(token: string) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      experimental: true,
      Accept: '*/*',
      'Content-Type': 'application/json',
    },
  };
}

export async function submitRespondToClaimResponse(req: Request): Promise<{ confirmationPath: string }> {
  const validatedCase = req.res?.locals.validatedCase;

  if (!validatedCase) {
    throw new RespondToClaimFinalSubmitError('validatedCase is undefined');
  }

  const caseId = validatedCase.id;
  const userAccessToken = req.session.user?.accessToken;

  if (!userAccessToken) {
    throw new RespondToClaimFinalSubmitError('No user access token in session');
  }

  const selectedPartyId = validatedCase.data.possessionClaimResponse?.currentDefendantPartyId;
  req.session.clientContext = {
    selectedPartyId: String(selectedPartyId),
  };

  logger.info(`Submitting response to claim for case ${caseId}`);

  const eventUrl = `${getBaseUrl()}/cases/${caseId}/event-triggers/respondPossessionClaim`;
  const startResponse = await http.get<{ token: string }>(eventUrl, getCaseHeaders(userAccessToken));
  const eventToken = startResponse.data.token;

  const submitUrl = `${getBaseUrl()}/cases/${caseId}/events`;
  // The draft version the statement of truth was saved against; pcs-api refuses the submit if the stored draft
  // has moved on since, so the declaration can never be attached to answers the citizen did not review.
  const draftVersion = validatedCase.data.possessionClaimResponse?.draftVersion;
  const payload = {
    data: {
      possessionClaimResponse: {
        ...(draftVersion !== undefined && draftVersion !== null && { draftVersion }),
      },
      ...(selectedPartyId !== null && { currentRepresentedPartyId: selectedPartyId }),
    },
    event: {
      id: 'respondPossessionClaim',
      summary: 'Citizen respondPossessionClaim summary',
      description: 'Citizen respondPossessionClaim description',
    },
    event_token: eventToken,
    ignore_warning: false,
  };

  let submittedCase: CcdCase;
  try {
    const submitResponse = await http.post<CcdCase>(submitUrl, payload, getCaseHeaders(userAccessToken));
    submittedCase = submitResponse.data;
  } catch (error) {
    if (isDraftChangedError(error)) {
      logger.warn(`Submit refused for case ${caseId}: draft changed after review`);
      throw new RespondToClaimDraftChangedError();
    }
    throw error;
  }

  logger.info(`Response submitted successfully for case ${caseId}`);

  const paymentPayload = parseSubmitPaymentPayload(submittedCase.after_submit_callback_response?.confirmation_body);
  const { confirmationPath, counterClaimFeePaymentRequired } = getRespondToClaimSubmitNavigation(
    caseId,
    validatedCase.data,
    paymentPayload
  );

  if (counterClaimFeePaymentRequired) {
    const counterClaim = validatedCase.data?.possessionClaimResponse?.defendantResponses?.counterClaim;
    await persistPaymentSessionState(req, {
      caseReference: caseId,
      serviceRequestReference: paymentPayload!.serviceRequestReference,
      feeAmount: paymentPayload!.feeAmount,
      counterClaimAmountInPence: getCounterClaimAmountInPence(counterClaim),
      counterClaimType: counterClaim?.claimType ?? paymentPayload?.counterClaimType,
    });
  }

  return { confirmationPath };
}

export function buildStatementOfTruthPayload(
  body: Record<string, unknown>,
  isLegalRepresentative: boolean
): NonNullable<NonNullable<PossessionClaimResponse['defendantResponses']>['statementOfTruth']> {
  const contempt = body?.statementOfTruthContempt as string[] | undefined;
  const belief = body?.statementOfTruthBelief as string[] | undefined;

  // Legal reps only sign the belief checkbox; citizens must sign both
  const bothAccepted = isLegalRepresentative
    ? belief?.includes('yes')
    : contempt?.includes('yes') && belief?.includes('yes');

  return {
    accepted: bothAccepted ? 'YES' : 'NO',
    fullName: (body?.fullName as string | undefined)?.trim(),
    ...(isLegalRepresentative
      ? {
          nameOfFirm: (body?.nameOfFirm as string | undefined)?.trim(),
          positionHeld: (body?.positionHeld as string | undefined)?.trim(),
          hasLegalRepresentation: 'YES',
        }
      : {}),
  };
}
