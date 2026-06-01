import type { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware/oidc';
import { getTranslationFunction } from '@modules/i18n';
import { getCitizenClaims } from '@services/pcsApi/pcsApiService';
import { Logger } from '@modules/logger';

const logger = Logger.getLogger('claimSummary');

export const CLAIM_SUMMARY_ROUTE = '/claims';

export default function claimSummaryRoutes(app: Application): void {
  app.get(CLAIM_SUMMARY_ROUTE, oidcMiddleware, async (req: Request, res: Response) => {
    const accessToken = req.session.user?.accessToken;

    if (!accessToken) {
      return res.redirect('/login');
    }

    await req.i18n?.loadNamespaces(['claimSummary']);
    const t = getTranslationFunction(req, ['claimSummary', 'common']);

    try {
      const claimsAgainst = await getCitizenClaims(accessToken);
      const tableRows = claimsAgainst.map(claim => [
        { text: claim.caseRef },
        { text: claim.claimantName },
        { text: claim.propertyPostcode },
        { html: `<a href="/case/${claim.caseRef}/dashboard" class="govuk-link">${t('claimSummary:table.viewClaim')}</a>` },
      ]);
      return res.render('claim-summary', { tableRows, t });
    } catch (error) {
      logger.error('Failed to fetch citizen claims', error);
      return res.render('claim-summary', { tableRows: [], t });
    }
  });
}
