import { Logger } from '@hmcts/nodejs-logging';
import config from 'config';
import { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware/oidc';
import { ccdCaseService } from '../services/ccdCaseService';

export default function (app: Application): void {
  const logger = Logger.getLogger('case-details');

  app.get('/case-details', oidcMiddleware, async (req: Request, res: Response) => {
    try {
      // case ref from config
      const caseReference: string = config.get('caseReference');

      logger.info(`[case-details] Fetching case data for case reference: ${caseReference}`);

      // get case data from CCD
      const caseData = await ccdCaseService.getCaseByReference(req.session.user?.accessToken, caseReference);

      if (!caseData) {
        logger.warn(`[case-details] No case found for reference: ${caseReference}`);
        return res.status(404).render('case-details', {
          error: `Case not found for reference: ${caseReference}`,
          caseReference,
          caseData: null,
        });
      }

      logger.info(`[case-details] Successfully retrieved case data for: ${caseReference}`);

      res.render('case-details', {
        caseReference,
        caseData,
        error: null,
      });
    } catch (e) {
      logger.error(`[case-details] Failed to fetch case data. Error was: ${e}`);
      res.status(500).render('case-details', {
        error: `Error fetching case data: ${e}`,
        caseReference: config.get('caseReference'),
        caseData: null,
      });
    }
  });
}
