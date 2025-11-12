import { Logger } from '@hmcts/nodejs-logging';
import { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware/oidc';
import { documentClient } from '../services/documentClient';

export default function (app: Application): void {
  const logger = Logger.getLogger('document-download');

  app.get('/case/:caseId/documents/:documentId/download', oidcMiddleware, async (req: Request, res: Response) => {
    const { caseId, documentId } = req.params;

    try {
      logger.info(`[document-download] Downloading document ${documentId} for case ${caseId}`);

      // SSRF Protection: Validate caseId against session
      if (!req.session.authorisedCaseIds || !req.session.authorisedCaseIds.includes(caseId)) {
        logger.error(`[document-download] Unauthorised access attempt for case ${caseId}`);
        return res.status(403).send('Forbidden: Unauthorised case access');
      }

      // Get user access token
      const accessToken = req.session.user?.accessToken;
      if (!accessToken) {
        logger.error('[document-download] No access token found in session');
        return res.status(401).send('Unauthorized');
      }

      // Retrieve document from PCS API using the case ID and document UUID
      const fileResponse = await documentClient.retrieveDocument(caseId, documentId, accessToken);

      // Set response headers and stream binary data to client
      res.writeHead(200, {
        'Content-Type': fileResponse.contentType,
        'Content-Disposition': `attachment; filename="${fileResponse.fileName}"`,
        'Content-Length': fileResponse.data.length,
      });
      res.end(fileResponse.data);

      logger.info(`[document-download] Successfully downloaded document ${fileResponse.fileName}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[document-download] Failed to download document: ${errorMessage}`);
      res.status(500).send('Failed to download document');
    }
  });
}
