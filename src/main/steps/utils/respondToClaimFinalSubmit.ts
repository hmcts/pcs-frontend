/**
 * Shared CCD final-submit for respond-to-claim (citizen).
 *
 * Used by the end-of-journey CYA step (after SOT validation) and the legacy
 * POST /case/:caseReference/final-submit route.
 */
import config from 'config';
import type { Request } from 'express';

import { http } from '../../modules/http';

import { getCounterClaimAmountInPence } from './counterClaimAmount';
import { getRespondToClaimSubmitNavigation } from './postSubmissionRouting';

import { Logger } from '@modules/logger';
import type { CcdCase } from '@services/ccdCase.interface';
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

  logger.info(`Submitting response to claim for case ${caseId}`);

  const eventUrl = `${getBaseUrl()}/cases/${caseId}/event-triggers/respondPossessionClaim`;
  const startResponse = await http.get<{ token: string }>(eventUrl, getCaseHeaders(userAccessToken));
  const eventToken = startResponse.data.token;

  const submitUrl = `${getBaseUrl()}/cases/${caseId}/events`;
  const payload = {
    data: {
      possessionClaimResponse: {},
    },
    event: {
      id: 'respondPossessionClaim',
      summary: 'Citizen respondPossessionClaim summary',
      description: 'Citizen respondPossessionClaim description',
    },
    event_token: eventToken,
    ignore_warning: false,
  };

  const submitResponse = await http.post<CcdCase>(submitUrl, payload, getCaseHeaders(userAccessToken));
  const submittedCase = submitResponse.data;

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
