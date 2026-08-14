import axios from 'axios';
import config from 'config';
import type { Request } from 'express';
import { v4 as uuid } from 'uuid';

import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../steps/utils/buildDraftDefendantResponse';

import { createSecureToken } from './createSecureToken';

import { getValidatedLanguage } from '@modules/i18n';
import { Logger } from '@modules/logger';
import { isPcqEnabled } from '@utils/isPcqEnabled';

const logger = Logger.getLogger('startPcq');

// Where PCQ returns the citizen once they finish the questionnaire. PCQ interrupts the journey at
// the RA triage step, so we resume at triage's normal next step. `nav=1` marks the arrival as
// internal navigation — without it the access guard bounces a direct GET of a mid-section step
// back to the start of the section.
const RETURN_STEP = 'language-used?nav=1';

/**
 * Builds the PCQ invocation URL for the current request and reserves a PcqId against the case.
 *
 * Returns `null` when PCQ should be skipped. The questionnaire is optional, so every failure
 * (disabled, unhealthy, missing session/case, CCD write failure) leaves the citizen on the normal
 * journey rather than blocking their response.
 */
export async function startPcq(req: Request): Promise<string | null> {
  if (!(await isPcqEnabled(req))) {
    logger.debug('PCQ is not enabled.');
    return null;
  }

  const tokenKey = config.get<string>('secrets.pcs.pcs-pcq-token-key');
  const pcqUrl = config.get<string>('pcq.url');
  const pcqPath = config.get<string>('pcq.path');
  const healthUrl = `${pcqUrl}/health`;
  const serviceId = config.get<string>('pcq.serviceId');
  const actor = config.get<string>('pcq.actor');

  const ccdCase = req.res?.locals.validatedCase;
  const user = req.session?.user;

  if (!ccdCase?.id || !user?.accessToken) {
    logger.warn('Missing CCD case or user session, skipping PCQ redirect');
    return null;
  }

  // Guard on the PcqId itself: it is written below before we hand off to PCQ, so its presence
  // means this party has already been sent to the questionnaire and must not be sent again.
  // Read from the defendant slice of the draft — the same source the rest of the journey resumes
  // from — because the id is party-scoped, not case-scoped.
  if (ccdCase.data?.possessionClaimResponse?.defendantContactDetails?.party?.pcqId) {
    logger.debug('Party already has a PcqId');
    return null;
  }

  try {
    logger.info(`Checking Pcq health url: ${healthUrl}`);
    const health = await axios.get(healthUrl, { timeout: config.get<number>('pcq.healthTimeoutMs') });
    if (health.data.status !== 'UP') {
      logger.warn('PCQ service is not available, skipping');
      return null;
    }
  } catch (err) {
    logger.warn('PCQ health check failed:', err.message);
    return null;
  }

  const pcqId = uuid();

  // Not URL-encoded here: the query string is built with URLSearchParams below, which encodes it.
  // Encoding first would double-encode, and PCQ would store the mangled value (the token is
  // computed over these same params, so integrity still checks out and the fault stays silent).
  const partyId = user.email || ''; //TODO: Might want to change partyId to IDAM ID instead.
  const returnUrl = `${req.protocol}://${req.get('host')}/case/${ccdCase.id}/respond-to-claim/${RETURN_STEP}`;

  const params = {
    serviceId,
    actor,
    pcqId,
    partyId,
    returnUrl,
    language: getValidatedLanguage(req),
    ccdCaseId: ccdCase.id,
  };

  const secureToken = createSecureToken(params, tokenKey);

  // Reserve the PcqId against the defendant's slice before handing off — PCQ correlates the
  // citizen's answers back to us by this id, so it has to be persisted before they can answer.
  //
  // Go through buildDraftDefendantResponse/saveDraftDefendantResponse, the same choke point every
  // journey page uses. The backend draft-save fully REPLACES the defendant slice, so posting the
  // id on its own would wipe the answers already given.
  try {
    const response = buildDraftDefendantResponse(req);
    response.defendantContactDetails.party.pcqId = pcqId;

    await saveDraftDefendantResponse(req, response);
  } catch (err) {
    logger.error('Failed to persist the PCQ ID to the draft:', err);
    return null;
  }

  // The step controller writes this page's form data to the session immediately before calling us,
  // so flush it explicitly rather than letting the implicit end-of-response save race the citizen's
  // return leg from PCQ.
  await new Promise<void>((resolve, reject) => {
    req.session.save(err => {
      if (err) {
        logger.error('Failed to save session:', err);
        return reject(err);
      }
      return resolve();
    });
  });

  // `secureToken` contributes token/authTag/iv/salt. URLSearchParams escapes the base64 padding and
  // '+' characters; PCQ's query parser reverses that, so nothing may be pre-encoded here.
  const qs = new URLSearchParams({ ...params, ...secureToken }).toString();
  const redirectUrl = `${pcqUrl}${pcqPath}?${qs}`;
  logger.info('Redirecting to PCQ');

  return redirectUrl;
}
