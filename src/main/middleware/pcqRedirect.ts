import { Logger } from '@hmcts/nodejs-logging';
import axios from 'axios';
import config from 'config';
import { NextFunction, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';

import { ccdCaseService } from '../services/ccdCaseService';
import { createToken } from '../services/pcq/createToken';

const logger = Logger.getLogger('pcqRedirectMiddleware');

export function pcqRedirectMiddleware() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // TODO: Set pcq.enabled back to TRUE and remove this when we actually onboard with PCQ
    const pcqEnabled = config.get<boolean>('pcq.enabled');
    if (!pcqEnabled) {
      logger.debug('PCQ is not enabled.');
      return next();
    }

    const tokenKey: string = config.get<string>('secrets.pcs.pcs-pcq-token-key');
    const pcqUrl = config.get('pcq.url');
    const pcqPath = config.get('pcq.path');
    const healthUrl = `${pcqUrl}/health`;
    const serviceId = config.get<string>('pcq.serviceId');
    const actor = config.get<string>('pcq.actor');

    const ccdCase = res.locals.validatedCase;
    const user = req.session?.user;

    if (!ccdCase?.id || !user?.accessToken) {
      logger.warn('Missing CCD case or user session  skipping PCQ redirect');
      return next();
    }

    if (ccdCase.data?.userPcqIdSet === 'Yes') {
      logger.debug('User already have PcqId set');
      return next();
    }

    try {
      logger.info(`Checking Pcq health url: ${healthUrl}`);
      const health = await axios.get(healthUrl);
      if (health.data.status !== 'UP') {
        logger.warn('PCQ service is not available  skipping');
        return next();
      }
    } catch (err) {
      logger.warn('PCQ health check failed:', err.message);
      return next();
    }

    const pcqId = uuid();

    const partyId = encodeURIComponent(user.email || ''); //TODO: Might want to change partyId to IDAM ID instead.
    // TODO: Update returnUrl to use the appropriate journey's summary step
    const returnUrl = `${req.protocol}://${req.get('host')}/respond-to-claim/free-legal-advice`;

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
    const redirectQuery = {
      ...params,
      token,
    };

    try {
      const updatedCase = await ccdCaseService.updateDraftRespondToClaim(user.accessToken,  ccdCase.id,{
        data: {
          ...ccdCase.data,
          userPcqId: pcqId,
        },
      });

      res.locals.validatedCase = updatedCase;
    } catch (err) {
      logger.error('Failed to update CCD with PCQ ID:', err);
      return next();
    }

    await new Promise<void>((resolve, reject) => {
      req.session.save(err => {
        if (err) {
          logger.error('Failed to save session:', err);
          return reject(err);
        }

        const qs = new URLSearchParams(redirectQuery).toString();
        logger.info(`Redirect to PCQ URL : ${pcqUrl}${pcqPath}?${qs}`);
        res.redirect(`${pcqUrl}${pcqPath}?${qs}`);
        return resolve();
      });
    });
  };
}
