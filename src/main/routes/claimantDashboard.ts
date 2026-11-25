import type { Application, NextFunction, Request, Response } from 'express';

import { HTTPError } from '../HttpError';
import { VIEW_DOCUMENTS_ROUTE } from '../constants/caseRoutes';
import { CLAIMANT_DASHBOARD_ROUTE, PAY_CLAIM_FEE_ROUTE, makeAClaimPath } from '../constants/makeAClaimRoutes';
import { oidcMiddleware } from '../middleware/oidc';
import { taskListPath } from '../steps/make-a-claim/flow.config';

import { getTranslationFunction } from '@modules/i18n';
import { ccdCaseService } from '@services/ccdCaseService';
import { formatCaseReferenceForDisplay } from '@utils/caseReference';
import { findClaimantClaim, formatClaimantPropertyAddress, isDraftClaim } from '@utils/claimantClaims';

/** The states in which the claim is made and the court has yet to schedule a hearing. */
const AWAITING_HEARING_STATES = ['PENDING_CASE_ISSUED', 'CASE_ISSUED'];

const HELP_AND_SUPPORT_LINKS = [
  { key: 'helpWithFees', href: 'https://www.gov.uk/get-help-with-court-fees' },
  { key: 'mediation', href: 'https://www.gov.uk/guidance/a-guide-to-civil-mediation' },
  {
    key: 'whatToExpectAtAHearing',
    href: 'https://www.gov.uk/guidance/what-to-expect-coming-to-a-court-or-tribunal',
  },
  { key: 'representMyselfAtAHearing', href: 'https://www.gov.uk/represent-yourself-in-court' },
  { key: 'findLegalAdvice', href: 'https://www.gov.uk/find-legal-advice' },
  { key: 'findInformationAboutMyCourt', href: 'https://www.gov.uk/find-court-tribunal' },
] as const;

/**
 * The claimant's dashboard for a submitted claim. Only the citizen who created the case may open it: pcs-api
 * lists the cases a citizen created as claimant, and any other case, including one they are a defendant in, is
 * shown as not found.
 */
export default function claimantDashboardRoutes(app: Application): void {
  app.get(CLAIMANT_DASHBOARD_ROUTE, oidcMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    const caseReference = req.params.caseReference as string;
    const accessToken = req.session.user?.accessToken;

    if (!accessToken) {
      return next(new HTTPError('Authentication required', 401));
    }

    try {
      const claim = await findClaimantClaim(accessToken, caseReference);
      if (!claim) {
        return next(new HTTPError('Case not found', 404));
      }
      if (isDraftClaim(claim)) {
        return res.redirect(303, taskListPath(caseReference));
      }

      await req.i18n?.loadNamespaces(['claimantDashboard']);
      const t = getTranslationFunction(req, ['claimantDashboard', 'common']);
      const ccdCase = await ccdCaseService.getCaseById(accessToken, caseReference);
      const feePaid = ccdCase.data.citizenPossessionClaim?.submission?.paymentStatus === 'PAID';
      const viewDocumentsUrl = makeAClaimPath(VIEW_DOCUMENTS_ROUTE, caseReference);
      const available = { text: t('claimantDashboard:tags.available'), classes: 'govuk-tag--blue' };

      const taskGroups = [
        {
          groupId: 'claim',
          title: t('claimantDashboard:groups.claim'),
          tasks: [
            ...(feePaid
              ? []
              : [
                  {
                    title: { text: t('claimantDashboard:tasks.payClaimFee') },
                    href: makeAClaimPath(PAY_CLAIM_FEE_ROUTE, caseReference),
                    status: { tag: { text: t('claimantDashboard:tags.notPaid'), classes: 'govuk-tag--red' } },
                  },
                ]),
            {
              title: { text: t('claimantDashboard:tasks.viewClaimForm') },
              href: viewDocumentsUrl,
              status: { tag: available },
            },
          ],
        },
        {
          groupId: 'documents',
          title: t('claimantDashboard:groups.documents'),
          tasks: [
            {
              title: { text: t('claimantDashboard:tasks.viewDocuments') },
              href: viewDocumentsUrl,
              status: { tag: available },
            },
          ],
        },
      ];

      return res.render('claimant-dashboard', {
        t,
        propertyAddress: formatClaimantPropertyAddress(claim.propertyAddress),
        caseNumber: formatCaseReferenceForDisplay(caseReference),
        claimMade: AWAITING_HEARING_STATES.includes(claim.state ?? ''),
        taskGroups,
        helpAndSupportLinks: HELP_AND_SUPPORT_LINKS,
      });
    } catch (error) {
      return next(error);
    }
  });
}
