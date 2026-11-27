import type { Application, NextFunction, Request, Response } from 'express';

import { CLAIMANT_DASHBOARD_ROUTE, MAKE_A_CLAIM_START_ROUTE, makeAClaimPath } from '../constants/makeAClaimRoutes';
import { oidcMiddleware } from '../middleware/oidc';
import { taskListPath } from '../steps/make-a-claim/flow.config';
import { isLegalRepresentativeUser, isStaffUser } from '../steps/utils/userRole';

import { getTranslationFunction } from '@modules/i18n';
import { Logger } from '@modules/logger';
import { getCitizenClaims, getClaimantClaims } from '@services/pcsApi/pcsApiService';
import { isDraftClaim } from '@utils/claimantClaims';
import { isMakeAClaimEnabled } from '@utils/makeAClaimFlags';

const logger = Logger.getLogger('claimList');

export const CLAIM_LIST_ROUTE = '/claims';

/** Whether to show the claimant's account page: citizens only, and only while the make a claim journey is on. */
async function showsClaimantAccount(req: Request): Promise<boolean> {
  if (isLegalRepresentativeUser(req) || isStaffUser(req)) {
    return false;
  }
  return isMakeAClaimEnabled(req);
}

export default function claimListRoutes(app: Application): void {
  app.get(CLAIM_LIST_ROUTE, oidcMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    const accessToken = req.session.user?.accessToken;

    if (!accessToken) {
      return res.redirect('/login');
    }

    await req.i18n?.loadNamespaces(['claimList']);
    const t = getTranslationFunction(req, ['claimList', 'common']);

    try {
      const claimantAccount = await showsClaimantAccount(req);
      const [claimsAgainstResult, claimsMadeResult] = await Promise.allSettled([
        getCitizenClaims(accessToken),
        claimantAccount ? getClaimantClaims(accessToken) : Promise.resolve([]),
      ]);
      if (claimsAgainstResult.status === 'rejected') {
        throw claimsAgainstResult.reason;
      }
      const claimsAgainst = claimsAgainstResult.value;
      const claimsMadeUnavailable = claimsMadeResult.status === 'rejected';
      if (claimsMadeResult.status === 'rejected') {
        logger.error('Failed to fetch the claims made by the citizen', claimsMadeResult.reason);
      }
      const claimsMade = claimsMadeResult.status === 'fulfilled' ? claimsMadeResult.value : [];
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
      const claimsMadeRows = claimsMade
        .filter(claim => claim.caseReference)
        .map(claim => {
          const reference = claim.caseReference as string;
          const draft = isDraftClaim(claim);
          const href = draft ? taskListPath(reference) : makeAClaimPath(CLAIMANT_DASHBOARD_ROUTE, reference);
          const unpaid = !draft && claim.paymentStatus !== 'PAID';
          const labelKey = draft ? 'draftClaim' : unpaid ? 'unpaidClaim' : 'submittedClaim';
          const label = t(`claimList:claimsMade.${labelKey}`);
          return [{ html: `<a href="${href}" class="govuk-link">${label}</a>` }, { text: reference }];
        });
      return res.render('claimList', {
        tableRows,
        claimantAccount,
        claimsMadeRows,
        claimsMadeUnavailable,
        makeAClaimUrl: MAKE_A_CLAIM_START_ROUTE,
        t,
      });
    } catch (error) {
      logger.error('Failed to fetch citizen claims', error);
      return next(error);
    }
  });
}
