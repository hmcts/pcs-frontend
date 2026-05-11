import { Application, Request, Response } from 'express';

import { ApplicationError, ApplicationErrorCode } from '../ApplicationError';
import { HTTPError } from '../HttpError';
import { oidcMiddleware } from '../middleware';

import { Logger } from '@modules/logger';
import { documentClient } from '@services/documentClient';

export default function downloadDocumentRoutes(app: Application): void {
  const logger = Logger.getLogger('document-download');

  app.get('/documents/:documentId/download', oidcMiddleware, async (req: Request, res: Response) => {
    const documentId = req.params.documentId as string;

    const accessToken = req.session.user?.accessToken;
    if (!accessToken) {
      logger.warn('User not authenticated - no access token');
      throw new HTTPError('Authentication required', 401);
    }

    logger.debug(`Downloading document ${documentId}`);

    try {
      // Retrieve document from PCS API using the document UUID
      const fileResponse = await documentClient.retrieveDocument(documentId, accessToken);

      // Set response headers and stream binary data to client
      res.writeHead(200, {
        'Content-Type': fileResponse.contentType,
        'Content-Disposition': `inline; filename="${fileResponse.fileName}"`,
        'Content-Length': fileResponse.data.length,
      });
      res.end(fileResponse.data);

      logger.debug(`Successfully downloaded document ${fileResponse.fileName}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to download document: ${errorMessage}`);
      throw new ApplicationError('Failed to download document', ApplicationErrorCode.documentNotAvailable);
    }
  });
}
