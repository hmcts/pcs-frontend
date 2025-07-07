import { Logger } from '@hmcts/nodejs-logging';
import axios from 'axios';
import config from 'config';
import { NextFunction, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';

import { createToken } from '../services/pcq/createToken';
// import { ccdCaseService } from '../services/ccdCaseService';

const logger = Logger.getLogger('pcqRedirectMiddleware');

export function pcqRedirectMiddleware() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const tokenKey: string = config.get('pcq.tokenKey');
    const pcqUrl = config.get('pcq.url');
    const pcqPath = config.get('pcq.path');
    const healthUrl = `${pcqUrl}/health`;

    const ccdCase = req.session?.ccdCase;
    const user = req.session?.user;

    logger.info('calling pcqRedirectMiddleware============= ');

    if (!tokenKey) {
      logger.warn('PCQ token key is not configured.');
      return next();
    }

    if (!ccdCase?.id || !user?.accessToken) {
      logger.warn('Missing CCD case or user session  skipping PCQ redirect');
      return next();
    }

    // Already has a PCQ ID – skip redirect
    if (ccdCase.data?.pcqId) {
      logger.info(`PCQ id found ${ccdCase.data?.pcqId}`);
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
    logger.info(`Create a new pcqId => ${pcqId}`);
    // const protocol = req.app.locals?.developmentMode ? 'http://' : '';
    // const port = req.app.locals?.developmentMode ? `:${config.get('port')}` : '';

    const partyId = encodeURIComponent(user.email || '');
    const returnUrl = `${req.protocol}://${req.get('host')}/steps/user-journey/summary`;

    const params = {
      serviceId: 'PCS',
      actor: 'APPLICANT',
      pcqId,
      partyId,
      returnUrl,
      language: 'en',
      ccdCaseId: ccdCase.id,
    };

    const token = createToken(params, tokenKey);
    const redirectQuery = {
      ...params,
      token,
    };

    // Save PCQ ID to CCD
    // try {
    //   const updatedCase = await ccdCaseService.updateCase(user.accessToken, {
    //     id: ccdCase.id,
    //     data: {
    //       ...ccdCase.data,
    //       pcqId,
    //     },
    //   });

    //   req.session.ccdCase = updatedCase;
    // } catch (err) {
    //   logger.error('Failed to update CCD with PCQ ID:', err);
    //   return next();
    // }

    await new Promise<void>((resolve, reject) => {
      req.session.save(err => {
        if (err) {
          logger.error('Failed to save session:', err);
          return reject(err);
        }

        const qs = new URLSearchParams(redirectQuery).toString();
        logger.info(`Redirect to URL : ${pcqUrl}${pcqPath}?${qs}`);
        res.redirect(`${pcqUrl}${pcqPath}?${qs}`);
        return resolve();
      });
    });
  };
}
