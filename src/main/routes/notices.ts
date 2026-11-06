import { Application, NextFunction, Request, Response } from 'express';

import { HTTPError } from '../HttpError';
import { VIEW_ORDERS_AND_NOTICES_ROUTE } from '../constants/caseRoutes';
import { oidcMiddleware } from '../middleware';

import { getDashboardUrl } from '@routes/dashboard';
import { ccdCaseService } from '@services/ccdCaseService';
import { ORDERS_AND_NOTICES_FOLDER_KEYS, extractViewDocumentFolders } from '@utils/documentUtils';

export default function noticesRoutes(app: Application): void {
  app.get(VIEW_ORDERS_AND_NOTICES_ROUTE, oidcMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    // caseReferenceParamMiddleware (registered app-level) sanitises this param
    // and short-circuits with a 404 if it's malformed.
    const caseReference = req.params.caseReference as string;
    const accessToken = req.session.user?.accessToken;

    if (!accessToken) {
      return next(new HTTPError('Authentication required', 401));
    }

    try {
      const ccdCase = await ccdCaseService.getCaseById(accessToken, caseReference);

      res.render('view-orders-and-notices', {
        dashboardUrl: getDashboardUrl(caseReference),
        backUrl: getDashboardUrl(caseReference),
        caseReference,
        documentFolders: extractViewDocumentFolders((ccdCase.data ?? {}) as Record<string, unknown>, {
          folderKeys: ORDERS_AND_NOTICES_FOLDER_KEYS,
          folderTitles: {
            enforcement: req.t('dashboard:viewOrdersAndNotices.folders.enforcement'),
          },
        }),
      });
    } catch (error) {
      next(error);
    }
  });
}
