import axios from 'axios';
import config from 'config';
import type { Request } from 'express';
import { v4 as uuid } from 'uuid';

import { createToken } from './createToken';

import { Logger } from '@modules/logger';
import { CcdCaseModel } from '@services/ccdCaseData.model';
import { ccdCaseService } from '@services/ccdCaseService';
import { journeyRegistry } from '@steps';

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
  // TODO: Set pcq.enabled back to TRUE and remove this when we actually onboard with PCQ
  if (!config.get<boolean>('pcq.enabled')) {
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
  if (ccdCase.userPcqId) {
    logger.debug('User already has PcqId set');
    return null;
  }

  try {
    logger.info(`Checking Pcq health url: ${healthUrl}`);
    const health = await axios.get(healthUrl);
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
    language: 'en', // TODO: update the language when the translation is implemented
    ccdCaseId: ccdCase.id,
  };

  const token = createToken(params, tokenKey);

  const { draftEvent } = journeyRegistry.respondToClaim;
  if (!draftEvent) {
    logger.warn('draftEvent not configured for respondToClaim journey, skipping PCQ update');
    return null;
  }

  // Reserve the PcqId against the case before handing off — PCQ correlates the citizen's answers
  // back to us by this id, so it has to be persisted before they can possibly answer.
  try {
    const updatedCase = await ccdCaseService.updateDraft(draftEvent, user.accessToken, ccdCase.id, {
      ...ccdCase.data,
      userPcqId: pcqId,
    });

    if (req.res) {
      req.res.locals.validatedCase = new CcdCaseModel(updatedCase);
    }
  } catch (err) {
    logger.error('Failed to update CCD with PCQ ID:', err);
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

  const qs = new URLSearchParams({ ...params, token }).toString();
  const redirectUrl = `${pcqUrl}${pcqPath}?${qs}`;
  logger.info(`Redirect to PCQ URL : ${redirectUrl}`);

  return redirectUrl;
}
