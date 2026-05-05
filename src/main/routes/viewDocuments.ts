import { Application, NextFunction, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware';

import { getDashboardUrl } from '@routes/dashboard';
import { ccdCaseService } from '@services/ccdCaseService';
import { extractViewDocumentFolders } from '@utils/documentUtils';

export default function viewDocumentsRoutes(app: Application): void {
  app.get('/case/:caseId/view-documents', oidcMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    const caseReference = typeof req.params.caseId === 'string' ? req.params.caseId : '';
    const accessToken = req.session.user?.accessToken;

    if (!accessToken) {
      return next(new Error('Authentication required'));
    }

    try {
      const caseData = await ccdCaseService.getCaseById(accessToken, caseReference);
      const locale = req.language === 'cy' ? 'cy-GB' : 'en-GB';

      res.render('view-documents', {
        dashboardUrl: getDashboardUrl(caseReference),
        backUrl: getDashboardUrl(caseReference),
        caseReference,
        documentFolders: extractViewDocumentFolders(caseData.data, locale),
      });
    } catch (error) {
      next(error);
    }
  });
}
