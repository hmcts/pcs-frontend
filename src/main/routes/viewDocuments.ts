import { Application, NextFunction, Request, Response } from 'express';

import { HTTPError } from '../HttpError';
import { oidcMiddleware } from '../middleware';

import { getDashboardUrl } from '@routes/dashboard';
import { ccdCaseService } from '@services/ccdCaseService';
import { getDocumentStream } from '@services/cdamService';
import { extractViewDocumentFolders } from '@utils/documentUtils';

function toSafeFilename(value: string): string {
  return value.replace(/"/g, '');
}

export default function viewDocumentsRoutes(app: Application): void {
  app.get('/case/:caseId/view-documents', oidcMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    const caseReference = typeof req.params.caseId === 'string' ? req.params.caseId : '';
    const accessToken = req.session.user?.accessToken;

    if (!accessToken) {
      return next(new HTTPError('Authentication required', 401));
    }

    try {
      const caseData = await ccdCaseService.getCaseById(accessToken, caseReference);

      res.render('view-documents', {
        dashboardUrl: getDashboardUrl(caseReference),
        backUrl: getDashboardUrl(caseReference),
        caseReference,
        documentFolders: extractViewDocumentFolders(caseData.data, {
          folderTitles: {
            statementsOfCase: req.t('dashboard:viewDocuments.folders.statementsOfCase'),
            propertyDocuments: req.t('dashboard:viewDocuments.folders.propertyDocuments'),
            evidence: req.t('dashboard:viewDocuments.folders.evidence'),
            correspondence: req.t('dashboard:viewDocuments.folders.correspondence'),
          },
        }),
      });
    } catch (error) {
      next(error);
    }
  });

  app.get(
    '/case/:caseId/view-documents/:documentId',
    oidcMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      const caseReference = typeof req.params.caseId === 'string' ? req.params.caseId : '';
      const documentId = typeof req.params.documentId === 'string' ? req.params.documentId.trim() : '';
      const accessToken = req.session.user?.accessToken;

      if (!accessToken) {
        return next(new HTTPError('Authentication required', 401));
      }
      if (!documentId) {
        return next(new HTTPError('Document not found', 404));
      }

      try {
        const { stream, contentType, contentLength, contentDisposition, filename } =
          await getDocumentStream(accessToken, caseReference, documentId);

        res.setHeader('Content-Type', contentType || 'application/octet-stream');
        if (contentLength) {
          res.setHeader('Content-Length', contentLength);
        }
        res.setHeader(
          'Content-Disposition',
          contentDisposition || `inline; filename="${toSafeFilename(filename)}"`
        );

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
