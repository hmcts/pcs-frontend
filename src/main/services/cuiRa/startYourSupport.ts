import config from 'config';
import type { Request } from 'express';

import { HTTPError } from '../../HttpError';

import type { CuiRaFlags, CuiRaInvocationRequest } from './cuiRa.interface';
import { cuiRaService } from './cuiRaService';
import { toCuiRaFlags } from './flagMapping';

import { http } from '@modules/http';
import { Logger } from '@modules/logger';
import { getValidatedLanguage } from '@modules/steps';
import type { CcdCaseModel } from '@services/ccdCaseData.model';

const logger = Logger.getLogger('startYourSupport');

// cui-ra requires a non-empty roleOnCase.
const DEFENDANT_ROLE_ON_CASE = 'Defendant';

function resolveDefendantPartyName(validatedCase: CcdCaseModel): string {
  return (
    validatedCase.defendantContactDetailsPartyName ||
    validatedCase.claimantEnteredDefendantDetailsName ||
    validatedCase.defendantName ||
    ''
  );
}

// Builds the cui-ra invocation payload from the current request/case and invokes the
// microsite, returning the URL the browser should be redirected to (the YS questions).
export async function startYourSupport(req: Request): Promise<string> {
  const accessToken = req.session.user?.accessToken;
  if (!accessToken) {
    throw new HTTPError('Authentication required to start Your Support', 401);
  }

  const validatedCase = req.res?.locals.validatedCase;
  if (!validatedCase) {
    throw new HTTPError('Case not available to start Your Support', 400);
  }

  // Source the S2S token because cui-ya want's it set in a custom service-token header
  let serviceToken: string;
  try {
    serviceToken = await http.getValidS2SToken();
  } catch (error) {
    logger.error('No S2S service token available to start Your Support', error);
    throw new HTTPError('Service token unavailable', 500);
  }

  const caseReference = validatedCase.id;
  const partyName = resolveDefendantPartyName(validatedCase);
  if (!partyName) {
    logger.warn(`Starting Your Support for case ${caseReference} with an empty defendant party name`);
  }

  // Pre-populate the microsite with any adjustments already captured for this defendant
  const storedFlags = validatedCase.data?.possessionClaimResponse?.defendantFlags;
  const existingFlags: CuiRaFlags = {
    partyName,
    roleOnCase: DEFENDANT_ROLE_ON_CASE,
    details: storedFlags ? toCuiRaFlags(storedFlags).details : [],
  };

  // Derive the callback/logout URLs from the request host (like startPcq's returnUrl), NOT a static
  // config value.
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  const body: CuiRaInvocationRequest = {
    callbackUrl: `${baseUrl}/case/${caseReference}/respond-to-claim/reasonable-adjustments/callback/:id`,
    logoutUrl: `${baseUrl}/logout`,
    language: getValidatedLanguage(req),
    existingFlags,
    hmctsServiceId: config.get<string>('cuiRa.hmctsServiceId'),
    masterFlagCode: config.get<string>('cuiRa.masterFlagCode'),
    correlationId: caseReference,
  };

  return cuiRaService.invokePayload({ accessToken, serviceToken, body });
}
