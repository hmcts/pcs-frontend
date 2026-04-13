import type { Request, Response } from 'express';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { getDashboardUrl } from '../../../routes/dashboard';
import { RESPOND_TO_CLAIM_ROUTE, flowConfig } from '../flow.config';

import { createGetController, createStepNavigation } from '@modules/steps';

const stepName = 'payment-interstitial';
const stepNavigation = createStepNavigation(flowConfig);

export const step: StepDefinition = {
  url: `${RESPOND_TO_CLAIM_ROUTE}/payment-interstitial`,
  name: stepName,
  view: 'respond-to-claim/payment-interstitial/paymentInterstitial.njk',
  stepDir: __dirname,
  getController: () => {
    return createGetController(
      'respond-to-claim/payment-interstitial/paymentInterstitial.njk',
      stepName,
      stepNavigation,
      async (req: Request) => {
        const t = req.t;

        if (!t) {
          throw new Error('Translation function not available');
        }

        const claimantName = req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.claimantOrganisations?.[0]
          ?.value as string | undefined;

        return {
          backUrl: await stepNavigation.getBackUrl(req, stepName),
          dashboardUrl: getDashboardUrl(req.res?.locals.validatedCase?.id),
          cancel: t('buttons.cancel', { ns: 'common' }),
          caption: t('caption'),
          heading: t('heading'),
          paragraph1: t('paragraph1', { claimantName }),
          paragraph2: t('paragraph2'),
          paragraph3: t('paragraph3'),
          paragraph4: t('paragraph4'),
          bullet1: t('bullet1'),
          bullet2: t('bullet2'),
        };
      },
      'respondToClaim'
    );
  },
  postController: {
    post: async (req: Request, res: Response) => {
      const redirectPath = await stepNavigation.getNextStepUrl(req, stepName, req.body);

      if (!redirectPath) {
        return res.status(404).render('not-found');
      }

      res.redirect(303, redirectPath);
    },
  },
};
