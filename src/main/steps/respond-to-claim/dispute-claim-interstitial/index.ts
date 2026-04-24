import type { Request, Response } from 'express';

import { getFlowConfigForJourney } from '../../../steps';
import { getClaimantName } from '../../utils/getClaimantName';
import { RESPOND_TO_CLAIM_ROUTE, flowConfig } from '../flow.config';

import { createGetController, createStepNavigation } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { getDashboardUrl } from '@routes/dashboard';

const journeyName = 'respondToClaim';
const stepName = 'dispute-claim-interstitial';
const stepNavigation = createStepNavigation(req => getFlowConfigForJourney(journeyName, req) || flowConfig);

export const step: StepDefinition = {
  url: `${RESPOND_TO_CLAIM_ROUTE}/dispute-claim-interstitial`,
  name: stepName,
  view: 'respond-to-claim/dispute-claim-interstitial/disputeClaimInterstitial.njk',
  stepDir: __dirname,
  getController: () => {
    return createGetController(
      'respond-to-claim/dispute-claim-interstitial/disputeClaimInterstitial.njk',
      stepName,
      stepNavigation,
      async (req: Request) => {
        const t = req.t;

        if (!t) {
          throw new Error('Translation function not available');
        }

        const claimantName = getClaimantName(req);
        const { id: caseId } = req.res?.locals?.validatedCase ?? { id: '' };

        return {
          backUrl: await stepNavigation.getBackUrl(req, stepName),
          dashboardUrl: getDashboardUrl(caseId),
          // these keys override the translations from the step namespace but interpolate the claimantName
          cancel: t('buttons.cancel', { ns: 'common' }),
          heading: t('heading', { claimantName }),
          paragraph1: t('paragraph1', { claimantName }),
          paragraph4: t('paragraph4', { claimantName }),
        };
      },
      'respondToClaim'
    );
  },
  postController: {
    post: async (req: Request, res: Response) => {
      // Get next step URL and redirect
      const redirectPath = await stepNavigation.getNextStepUrl(req, stepName);

      if (!redirectPath) {
        // No next step defined - show not found page
        return res.status(404).render('not-found');
      }

      res.redirect(303, redirectPath);
    },
  },
};
