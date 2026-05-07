import { Application, NextFunction, Request, Response } from 'express';

import { HTTPError } from '../HttpError';
import { oidcMiddleware } from '../middleware';

import { getDashboardUrl } from '@routes/dashboard';
import { ccdCaseService } from '@services/ccdCaseService';
import { extractViewDocumentFolders } from '@utils/documentUtils';

export default function viewDocumentsRoutes(app: Application): void {
  app.get('/case/:caseId/view-documents', oidcMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    const caseReference = typeof req.params.caseId === 'string' ? req.params.caseId : '';
    const accessToken = req.session.user?.accessToken;

    if (!accessToken) {
      return next(new HTTPError('Authentication required', 401));
    }

    try {
      const caseData = await ccdCaseService.getCaseById(accessToken, caseReference);
      const locale = req.language === 'cy' ? 'cy-GB' : 'en-GB';

      res.render('view-documents', {
        dashboardUrl: getDashboardUrl(caseReference),
        backUrl: getDashboardUrl(caseReference),
        caseReference,
        documentFolders: extractViewDocumentFolders(caseData.data, {
          locale,
          submittedOnPrefix: req.t('dashboard:viewDocuments.submittedOn'),
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
      const accessToken = req.session.user?.accessToken;

      if (!accessToken) {
        return next(new HTTPError('Authentication required', 401));
      }

      try {
        return res.render('view-document');
      } catch (error) {
        return next(error);
      }
    }
  );
}
