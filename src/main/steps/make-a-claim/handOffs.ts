import config from 'config';
import type { Request } from 'express';
import { v4 as uuid } from 'uuid';

import { HTTPError } from '../../HttpError';

import { readClaim } from './claimDraft';
import { flowConfig } from './flow.config';

import { http } from '@modules/http';
import { getValidatedLanguage } from '@modules/i18n';
import { Logger } from '@modules/logger';
import { getStepUrl } from '@modules/steps/flow';
import type { CitizenPossessionClaim } from '@services/citizenPossessionClaim.interface';
import type { CuiRaFlags, CuiRaInvocationRequest } from '@services/cuiRa/cuiRa.interface';
import { cuiRaService } from '@services/cuiRa/cuiRaService';
import { toCuiRaFlags } from '@services/cuiRa/flagMapping';
import { isPcqHealthy, pcqUrlFor } from '@services/pcq/pcqLink';
import { isPcqEnabled } from '@utils/isPcqEnabled';

const logger = Logger.getLogger('makeAClaimHandOffs');

const CLAIMANT_ROLE_ON_CASE = 'Claimant';

/** Where Your Support (cui-ra) sends the claimant back to; cui-ra fills in the id of the payload it holds. */
export const REASONABLE_ADJUSTMENTS_CALLBACK_PATH = 'make-a-claim/reasonable-adjustments/callback';

export function claimantNameOf(claim: CitizenPossessionClaim): string {
  const claimant = claim.claimant ?? {};
  return claimant.individualOrOrganisation === 'ORGANISATION'
    ? (claimant.organisationName ?? '')
    : [claimant.firstName, claimant.lastName].filter(Boolean).join(' ');
}

/**
 * Starts the Your Support (cui-ra) questions for the claimant and returns the URL to send them to. The case
 * reference is the correlation id the callback checks the returned payload against.
 */
export async function startClaimantYourSupport(req: Request): Promise<string> {
  const accessToken = req.session.user?.accessToken;
  const caseReference = req.res?.locals.validatedCase?.id;
  if (!accessToken || !caseReference) {
    throw new HTTPError('Authentication and a case are required to start Your Support', 401);
  }
  let serviceToken: string;
  try {
    serviceToken = await http.getValidS2SToken();
  } catch (error) {
    logger.error('No S2S service token available to start Your Support', error);
    throw new HTTPError('Service token unavailable', 500);
  }

  const claim = readClaim(req);
  const stored = claim.otherInformation?.supportFlags;
  const existingFlags: CuiRaFlags = {
    ...(stored ? toCuiRaFlags(stored) : { details: [] }),
    partyName: stored?.partyName || claimantNameOf(claim),
    roleOnCase: CLAIMANT_ROLE_ON_CASE,
  };
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const body: CuiRaInvocationRequest = {
    callbackUrl: `${baseUrl}/case/${caseReference}/${REASONABLE_ADJUSTMENTS_CALLBACK_PATH}/:id`,
    logoutUrl: `${baseUrl}/logout`,
    language: getValidatedLanguage(req),
    existingFlags,
    hmctsServiceId: config.get<string>('cuiRa.hmctsServiceId'),
    masterFlagCode: config.get<string>('cuiRa.masterFlagCode'),
    correlationId: caseReference,
  };
  return cuiRaService.invokePayload({ accessToken, serviceToken, body });
}

/** Whether the PCQ questions can be offered: the feature is on and the service is up. */
export async function isPcqAvailable(req: Request): Promise<boolean> {
  if (!(await isPcqEnabled(req))) {
    return false;
  }
  return isPcqHealthy();
}

export interface PcqHandOff {
  pcqId: string;
  url: string;
}

/**
 * The URL that sends the claimant to PCQ, with the id to record against the claim before they go, or null when the
 * questions are not offered. The questionnaire is optional, so every failure leaves the claimant on the journey.
 */
export async function startClaimantPcq(req: Request): Promise<PcqHandOff | null> {
  const caseReference = req.res?.locals.validatedCase?.id;
  const user = req.session?.user;
  if (!caseReference || !user?.accessToken) {
    logger.warn('Missing case or user session, skipping PCQ redirect');
    return null;
  }
  if (readClaim(req).otherInformation?.pcqId || !(await isPcqAvailable(req))) {
    return null;
  }
  const partyId = String(user.uid ?? user.sub ?? '');
  if (!partyId) {
    logger.warn('No party id available for PCQ, skipping');
    return null;
  }

  const pcqId = uuid();
  const params = {
    serviceId: config.get<string>('pcq.serviceId'),
    actor: config.get<string>('pcq.claimantActor'),
    pcqId,
    partyId,
    // The spec requires the return URL without the scheme
    returnUrl: `${req.get('host')}${getStepUrl('language-used', flowConfig, caseReference)}`,
    language: getValidatedLanguage(req),
    ccdCaseId: caseReference,
  };
  return { pcqId, url: pcqUrlFor(params) };
}

/**
 * The page after Your Support: the equality questions, unless they cannot be offered or were answered or declined
 * already, then the language used.
 */
export async function pageAfterSupport(
  req: Request,
  claim: CitizenPossessionClaim,
  caseReference: string
): Promise<string> {
  const offered = !claim.otherInformation?.equalityQuestionsChoice && (await isPcqAvailable(req));
  return getStepUrl(offered ? 'equality-and-diversity' : 'language-used', flowConfig, caseReference);
}
