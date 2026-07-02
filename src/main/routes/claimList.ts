import type { Application, NextFunction, Request, Response } from 'express';

import { requireRoles } from '../access-control';
import { oidcMiddleware } from '../middleware/oidc';
import { CITIZEN_USER_ROLES } from '../steps/utils/userRole';

import { getTranslationFunction } from '@modules/i18n';
import { Logger } from '@modules/logger';
import { getCitizenClaims } from '@services/pcsApi/pcsApiService';

const logger = Logger.getLogger('claimList');

export const CLAIM_LIST_ROUTE = '/claims';

export default function claimListRoutes(app: Application): void {
  app.get(
    CLAIM_LIST_ROUTE,
    oidcMiddleware,
    requireRoles(CITIZEN_USER_ROLES, 'claims'),
    async (req: Request, res: Response, next: NextFunction) => {
      const accessToken = req.session.user?.accessToken;

      if (!accessToken) {
        return res.redirect('/login');
      }

      await req.i18n?.loadNamespaces(['claimList']);
      const t = getTranslationFunction(req, ['claimList', 'common']);

      try {
        const claimsAgainst = await getCitizenClaims(accessToken);
        const tableRows = claimsAgainst
          .filter(claim => claim.caseReference)
          .map(claim => [
            { text: claim.caseReference },
            { text: claim.claimantName },
            { text: claim.propertyPostcode },
            {
              html: `<a href="/case/${claim.caseReference}/dashboard" class="govuk-link">${t('claimList:table.viewClaim')}</a>`,
            },
          ]);
        return res.render('claimList', { tableRows, t });
      } catch (error) {
        logger.error('Failed to fetch citizen claims', error);
        return next(error);
      }
    }
  );
}
