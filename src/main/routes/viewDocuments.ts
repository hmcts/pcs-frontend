import { Application, NextFunction, Request, Response } from 'express';

import { HTTPError } from '../HttpError';
import { oidcMiddleware } from '../middleware';

import { getDashboardUrl } from '@routes/dashboard';
import { getDocumentBinary } from '@services/cdamService';
import { extractViewDocumentFolders } from '@utils/documentUtils';
import { asHeaderString } from '@utils/httpHeaders';
import { sanitiseUUID } from '@utils/uuid';

function toSafeFilename(value: string): string {
  return value.replace(/"/g, '');
}

export default function viewDocumentsRoutes(app: Application): void {
  app.get(
    '/case/:caseReference/view-documents',
    oidcMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
    const validatedCase = res.locals.validatedCase as { id: string; data: any } | undefined;
    const caseReference = validatedCase?.id || '';
    const accessToken = req.session.user?.accessToken;

    if (!caseReference) {
      return next(new HTTPError('Invalid case reference format', 404));
    }
    if (!accessToken) {
      return next(new HTTPError('Authentication required', 401));
    }

    try {
      res.render('view-documents', {
        dashboardUrl: getDashboardUrl(caseReference),
        backUrl: getDashboardUrl(caseReference),
        caseReference,
        documentFolders: extractViewDocumentFolders((validatedCase?.data ?? {}) as Record<string, unknown>, {
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
    }
  );

  app.get(
    '/case/:caseReference/view-documents/:documentId',
    oidcMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      const validatedCase = res.locals.validatedCase as { id: string; data: any } | undefined;
      const caseReference = validatedCase?.id || '';
      const documentId = sanitiseUUID(req.params.documentId);
      const accessToken = req.session.user?.accessToken;

      if (!caseReference) {
        return next(new HTTPError('Invalid case reference format', 404));
      }
      if (!accessToken) {
        return next(new HTTPError('Authentication required', 401));
      }
      if (!documentId) {
        return next(new HTTPError('Document not found', 404));
      }

      try {
        const allDocuments = (validatedCase?.data?.allDocuments ?? []) as Array<{
          id?: string;
          value?: { document_filename?: string; document_binary_url?: string };
        }>;
        const document = allDocuments.find(item => item.id === documentId)?.value;
        const filename = document?.document_filename?.trim() || 'document';
        const binaryUrl = document?.document_binary_url?.trim();
        if (!binaryUrl) {
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
