import config from 'config';
import type { Request } from 'express';

import { HTTPError } from '../../HttpError';

import type { CuiRaFlags, CuiRaInvocationRequest } from './cuiRa.interface';
import { cuiRaService } from './cuiRaService';

import { Logger } from '@modules/logger';
import { getValidatedLanguage } from '@modules/steps';
import type { CcdCaseModel } from '@services/ccdCaseData.model';

const logger = Logger.getLogger('startYourSupport');

// A responding defendant's role on the case. cui-ra requires a non-empty roleOnCase.
// TODO(confirm): exact string cui-ra expects for a responding defendant.
const DEFENDANT_ROLE_ON_CASE = 'Defendant';

function resolveDefendantPartyName(validatedCase: CcdCaseModel): string {
  return (
    validatedCase.defendantContactDetailsPartyName ||
    validatedCase.claimantEnteredDefendantDetailsName ||
    validatedCase.defendantName ||
    ''
  );
}

// `:caseReference` is substituted here; `:id` is left as a literal for the microsite
// to replace when it redirects back on the return leg (a later AC).
function applyCaseReference(template: string, caseReference: string): string {
  return template.replace(':caseReference', caseReference);
}

// Builds the cui-ra invocation payload from the current request/case and invokes the
// microsite, returning the URL the browser should be redirected to (the YS questions).
export async function startYourSupport(req: Request): Promise<string | null> {
  // Gate: skip Your Support if cui-ra isn't healthy (return null → the caller continues the
  // response journey). Checked first so we don't touch tokens/case when we're going to skip.
  if (!(await cuiRaService.isHealthy())) {
    return null;
  }

  const accessToken = req.session.user?.accessToken;
  if (!accessToken) {
    throw new HTTPError('Authentication required to start Your Support', 401);
  }

  const validatedCase = req.res?.locals.validatedCase;
  if (!validatedCase) {
    throw new HTTPError('Case not available to start Your Support', 400);
  }

  const serviceToken = await req.app.locals.redisClient?.get(config.get<string>('s2s.key'));
  if (!serviceToken) {
    logger.error('No S2S service token available to start Your Support');
    throw new HTTPError('Service token unavailable', 500);
  }

  const caseReference = validatedCase.id;
  const partyName = resolveDefendantPartyName(validatedCase);
  if (!partyName) {
    logger.warn(`Starting Your Support for case ${caseReference} with an empty defendant party name`);
  }

  const existingFlags: CuiRaFlags = {
    partyName,
    roleOnCase: DEFENDANT_ROLE_ON_CASE,
    details: [], // first-time capture: no existing adjustments to carry in
  };

  const body: CuiRaInvocationRequest = {
    callbackUrl: applyCaseReference(config.get<string>('cuiRa.callbackUrl'), caseReference),
    logoutUrl: applyCaseReference(config.get<string>('cuiRa.logoutUrl'), caseReference),
    language: getValidatedLanguage(req),
    existingFlags,
    hmctsServiceId: config.get<string>('cuiRa.hmctsServiceId'),
    masterFlagCode: config.get<string>('cuiRa.masterFlagCode'),
    correlationId: caseReference,
  };

  return cuiRaService.invokePayload({ accessToken, serviceToken, body });
}
