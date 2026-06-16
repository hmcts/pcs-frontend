import { Application, NextFunction, Request, Response } from 'express';

import { HTTPError } from '../HttpError';
import { oidcMiddleware } from '../middleware';

import { getDashboardUrl } from '@routes/dashboard';
import { ccdCaseService } from '@services/ccdCaseService';
import { getDocumentBinary } from '@services/cdamService';
import { extractViewDocumentFolders, findCaseDocumentById } from '@utils/documentUtils';
import { asHeaderString } from '@utils/httpHeaders';
import { sanitiseUUID } from '@utils/uuid';

// view-documents is a read-only display, so we fetch the case directly via
// CCD's plain GET /cases/{id} (which enforces access — 403/404 if the user
// doesn't have permission). No event token is needed; requireEventAccess is
// reserved for write journeys (e.g. finalSubmit) where we want to fail-fast
// before the user fills in a long form.

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

        res.render('view-documents', {
          dashboardUrl: getDashboardUrl(caseReference),
          backUrl: getDashboardUrl(caseReference),
          caseReference,
          documentFolders: extractViewDocumentFolders((ccdCase.data ?? {}) as Record<string, unknown>, {
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
      const caseReference = req.params.caseReference as string;
      const documentId = sanitiseUUID(req.params.documentId);
      const accessToken = req.session.user?.accessToken;

      if (!accessToken) {
        return next(new HTTPError('Authentication required', 401));
      }
      if (!documentId) {
        return next(new HTTPError('Document not found', 404));
      }

      try {
<<<<<<< HEAD
        const ccdCase = await ccdCaseService.getCaseById(accessToken, caseReference);
        const allDocuments = (ccdCase.data?.allDocuments ?? []) as {
          id?: string;
          value?: { document_filename?: string; document_binary_url?: string };
        }[];
        const document = allDocuments.find(item => item.id === documentId)?.value;
        const filename = document?.document_filename?.trim() || 'document';
        const binaryUrl = document?.document_binary_url?.trim();
=======
        const document = findCaseDocumentById((validatedCase?.data ?? {}) as Record<string, unknown>, documentId);
        const filename = document?.filename?.trim() || 'document';
        const binaryUrl = document?.binaryUrl?.trim();
>>>>>>> 148d1d269 (Initial commit)
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
