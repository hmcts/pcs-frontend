import type { Request, Response } from 'express';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { getDashboardUrl } from '../../../routes/dashboard';
import { RESPOND_TO_CLAIM_ROUTE, flowConfig } from '../flow.config';

import { createGetController, createStepNavigation } from '@modules/steps';

const stepName = 'dispute-claim-interstitial';

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
        const activeFlowConfig = req.res?.locals?.journeyContext?.flowConfig || flowConfig;
        const navigation = createStepNavigation(activeFlowConfig);

        if (!t) {
          throw new Error('Translation function not available');
        }

        // Get claimant name from CCD callback data (res.locals.validatedCase)
        // Use only data from CCD - no hardcoded fallbacks
        const claimantName = req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.claimantOrganisations?.[0]
          ?.value as string | undefined;

        return {
          backUrl: await navigation.getBackUrl(req, stepName),
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
      const activeFlowConfig = req.res?.locals?.journeyContext?.flowConfig || flowConfig;
      const navigation = createStepNavigation(activeFlowConfig);
      // Get next step URL and redirect
      const redirectPath = await navigation.getNextStepUrl(req, stepName, req.body);

      if (!redirectPath) {
        // No next step defined - show not found page
        return res.status(404).render('not-found');
      }

      res.redirect(303, redirectPath);
    },
  },
};
