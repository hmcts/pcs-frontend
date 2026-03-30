import { buildHeaderModel } from '@hmcts-cft/cft-ui-component-lib';
import type { Request, Response } from 'express';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createGetController, stepNavigation } from '../../../modules/steps';
import { getDashboardUrl } from '../../../routes/dashboard';
import { RESPOND_TO_CLAIM_ROUTE } from '../flow.config';

const stepName = 'start-now';


export const headerModel = buildHeaderModel({
  xuiBaseUrl: 'http://pcs-api-aat.service.core-compute-aat.internal',
  user: { roles: ['caseworker-civil'] },
});

// const footerModel = buildFooterModel();


export const step: StepDefinition = {
  url: `${RESPOND_TO_CLAIM_ROUTE}/start-now`,
  name: stepName,
  view: 'respond-to-claim/start-now/startNow.njk',
  stepDir: __dirname,
  getController: () => {
    return createGetController(
      'respond-to-claim/start-now/startNow.njk',
      stepName,
      (req: Request) => {
        return {
          backUrl: getDashboardUrl(req.res?.locals.validatedCase?.id),
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
