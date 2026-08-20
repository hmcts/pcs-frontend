import { Application, NextFunction, Request, Response } from 'express';

import { HTTPError } from '../HttpError';
import { oidcMiddleware } from '../middleware';
import { Logger } from '../modules/logger';

import { getDashboardUrl } from '@routes/dashboard';
import { ccdCaseService } from '@services/ccdCaseService';
import { getDocumentBinary } from '@services/cdamService';
import { extractCaseDocuments, extractViewDocumentFolders, findCaseDocumentById } from '@utils/documentUtils';
import { asHeaderString } from '@utils/httpHeaders';
import { isUncategorisedDocumentsEnabled } from '@utils/isUncategorisedDocumentsEnabled';
import { sanitiseUUID } from '@utils/uuid';

const logger = Logger.getLogger('viewDocuments');

function toFilename(value: string): string {
  const filename = value.trim();
  return filename || 'document';
}

function encodeRFC5987ValueChars(value: string): string {
  return encodeURIComponent(value).replace(/['()*]/g, ch => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`);
}

function buildInlineContentDisposition(filename: string): string {
  const fallback = toFilename(filename);
  const utf8Filename = encodeRFC5987ValueChars(filename);
  return `inline; filename="${fallback}"; filename*=UTF-8''${utf8Filename}`;
}

export default function viewDocumentsRoutes(app: Application): void {
  app.get(
    '/case/:caseReference/view-documents',
    oidcMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      // caseReferenceParamMiddleware (registered app-level) sanitises this
      // param and short-circuits with a 404 if it's malformed.
      const caseReference = req.params.caseReference as string;
      const accessToken = req.session.user?.accessToken;

      if (!accessToken) {
        return next(new HTTPError('Authentication required', 401));
      }

      try {
        const ccdCase = await ccdCaseService.getCaseById(accessToken, caseReference);
        const uncategorisedEnabled = await isUncategorisedDocumentsEnabled(req);

        res.render('view-documents', {
          dashboardUrl: getDashboardUrl(caseReference),
          backUrl: getDashboardUrl(caseReference),
          caseReference,
          documentFolders: extractViewDocumentFolders((ccdCase.data ?? {}) as Record<string, unknown>, {
            includeUncategorised: uncategorisedEnabled,
            folderTitles: {
              statementsOfCase: req.t('dashboard:viewDocuments.folders.statementsOfCase'),
              propertyDocuments: req.t('dashboard:viewDocuments.folders.propertyDocuments'),
              evidence: req.t('dashboard:viewDocuments.folders.evidence'),
              correspondence: req.t('dashboard:viewDocuments.folders.correspondence'),
              ...(uncategorisedEnabled && {
                uncategorisedDocuments: req.t('dashboard:viewDocuments.folders.uncategorisedDocuments'),
              }),
            },
          }),
        });
      } catch (error) {
        next(error);
      }
    }
  );

  app.get(
    '/case/:caseReference/view-documents/:documentId',
    oidcMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      const caseReference = req.params.caseReference as string;
      const documentId = sanitiseUUID(req.params.documentId);
      const accessToken = req.session.user?.accessToken;

      if (!accessToken) {
        logger.warn('[viewDocuments] Authentication required', { caseReference });
        return next(new HTTPError('Authentication required', 401));
      }
      if (!documentId) {
        logger.warn('[viewDocuments] Invalid document ID param', { rawDocumentId: req.params.documentId });
        return next(new HTTPError('Document not found', 404));
      }

      try {
        logger.info('[viewDocuments] Document view request received', {
          caseReference,
          rawDocumentId: req.params.documentId,
          documentId,
        });
        const ccdCase = await ccdCaseService.getCaseById(accessToken, caseReference);

        const extractedDocs = extractCaseDocuments((ccdCase.data ?? {}) as Record<string, unknown>);
        logger.info('[viewDocuments] Extracted case documents', {
          count: extractedDocs.length,
          extractedDocIds: extractedDocs.map(doc => doc.id),
          extractedSourceFields: extractedDocs.map(doc => doc.sourceField),
        });

        const document = findCaseDocumentById((ccdCase.data ?? {}) as Record<string, unknown>, documentId);
        const filename = document?.filename || 'document';
        const binaryUrl = document?.binaryUrl?.trim();

        logger.info('[viewDocuments] Document lookup result', {
          documentFound: Boolean(document),
          filename,
          binaryUrl,
        });

        if (!binaryUrl) {
          logger.warn('[viewDocuments] Document not found or missing binaryUrl', { caseReference, documentId });
          return next(new HTTPError('Document not found', 404));
        }

        const binaryResponse = await getDocumentBinary(binaryUrl, accessToken);
        const stream = binaryResponse.stream;
        const contentType = asHeaderString(binaryResponse.contentType);
        const contentLength = asHeaderString(binaryResponse.contentLength);
        const contentDisposition = asHeaderString(binaryResponse.contentDisposition);

        res.setHeader('Content-Type', contentType || 'application/octet-stream');
        if (contentLength) {
          res.setHeader('Content-Length', contentLength);
        }
        res.setHeader('Content-Disposition', contentDisposition || buildInlineContentDisposition(filename));

        stream.on('error', () => {
          if (!res.headersSent) {
            next(new HTTPError('Failed to stream document', 502));
          }
        });
        stream.pipe(res);
      } catch (error) {
        return next(error);
      }
    }
  );
}
