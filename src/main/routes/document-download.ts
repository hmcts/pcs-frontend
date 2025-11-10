import { Logger } from '@hmcts/nodejs-logging';
import { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware/oidc';
import { documentClient } from '../services/documentClient';

export default function (app: Application): void {
  const logger = Logger.getLogger('document-download');

  app.get('/documents/:documentId/download', oidcMiddleware, async (req: Request, res: Response) => {
    const { documentId } = req.params;

    try {
      logger.info(`[document-download] Downloading document ${documentId}`);

      // Get user access token
      const accessToken = req.session.user?.accessToken;
      if (!accessToken) {
        logger.error('[document-download] No access token found in session');
        return res.status(401).send('Unauthorized');
      }

      // Retrieve document from PCS API using the document UUID
      const fileResponse = await documentClient.retrieveDocument(documentId, accessToken);

      // Set response headers and stream binary data to client
      res.writeHead(200, {
        'Content-Type': fileResponse.contentType,
        'Content-Disposition': `attachment; filename="${fileResponse.fileName}"`,
        'Content-Length': fileResponse.data.length,
      });
      res.end(fileResponse.data);

      logger.info(`[document-download] Successfully downloaded document ${fileResponse.fileName}`);
    } catch (error) {
      logger.error('[document-download] Failed to download document:', error);
      res.status(500).send('Failed to download document');
    }
  });
}
