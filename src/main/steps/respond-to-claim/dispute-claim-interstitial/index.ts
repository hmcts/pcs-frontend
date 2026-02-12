import type { Request, Response } from 'express';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createGetController, createStepNavigation } from '../../../modules/steps';
import { getDashboardUrl } from '../../../routes/dashboard';
import { RESPOND_TO_CLAIM_ROUTE, flowConfig } from '../flow.config';

const stepName = 'dispute-claim-interstitial';
const stepNavigation = createStepNavigation(flowConfig);

export const step: StepDefinition = {
  url: `${RESPOND_TO_CLAIM_ROUTE}/dispute-claim-interstitial`,
  name: stepName,
  view: 'respond-to-claim/dispute-claim-interstitial/disputeClaimInterstitial.njk',
  stepDir: __dirname,
  getController: () => {
    return createGetController(
      'respond-to-claim/dispute-claim-interstitial/disputeClaimInterstitial.njk',
      stepName,
      async (req: Request) => {
        const t = req.t;

        if (!t) {
          throw new Error('Translation function not available');
        }

        // Get claimant name from fresh START event data (res.locals.validatedCase)
        // Session no longer stores full case data, only caseId
        const claimantName =
          (req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.claimantOrganisations?.[0]?.value as
            | string
            | undefined) || 'Treetops Housing';

        return {
          backUrl: await stepNavigation.getBackUrl(req, stepName),
          dashboardUrl: getDashboardUrl(req.res?.locals.validatedCase?.id),
          // these keys override the translations from the step namespace but interpolate the claimantName
          cancel: t('buttons.cancel', { ns: 'common' }),
          heading: t('heading', { claimantName }),
          paragraph1: t('paragraph1', { claimantName }),
        };
      },
      'respondToClaim'
    );
  },
  postController: {
    post: async (req: Request, res: Response) => {
      // Get next step URL and redirect
      const redirectPath = await stepNavigation.getNextStepUrl(req, stepName, req.body);

      if (!redirectPath) {
        // No next step defined - show not found page
        return res.status(404).render('not-found');
      }

      res.redirect(303, redirectPath);
    },
  },
};
