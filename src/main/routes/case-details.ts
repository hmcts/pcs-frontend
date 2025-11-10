import { Logger } from '@hmcts/nodejs-logging';
import config from 'config';
import { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware/oidc';
import { ccdCaseService } from '../services/ccdCaseService';
import { documentIdExtractor } from '../services/documentClient';

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

      // Pre-process documents to extract the document UUID for download links
      if (caseData?.data?.tenancyLicenceDocuments) {
        caseData.data.tenancyLicenceDocuments = caseData.data.tenancyLicenceDocuments.map(doc => {
          logger.info(`[case-details] Processing document with binary URL: ${doc.value.document_binary_url}`);
          const extractedUuid = documentIdExtractor(doc.value.document_binary_url);
          logger.info(`[case-details] Extracted UUID: ${extractedUuid}`);

          if (!extractedUuid) {
            logger.warn(
              `[case-details] Failed to extract UUID from: ${doc.value.document_binary_url}, trying document_url: ${doc.value.document_url}`
            );
            // Try document_url as fallback
            const fallbackUuid = documentIdExtractor(doc.value.document_url);
            logger.info(`[case-details] Fallback UUID from document_url: ${fallbackUuid}`);
            return {
              ...doc,
              documentUuid: fallbackUuid,
            };
          }

          return {
            ...doc,
            documentUuid: extractedUuid,
          };
        });
      }

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
