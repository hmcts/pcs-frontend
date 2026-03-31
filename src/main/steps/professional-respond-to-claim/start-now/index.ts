import type { Request, Response } from 'express';
import { buildFooterModel, buildHeaderModel } from '@hmcts-cft/cft-ui-component-lib';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createGetController, professionalStepNavigation } from '../../../modules/steps';
import { getDashboardUrl } from '../../../routes/dashboard';
import { PROFESSIONAL_RESPOND_TO_CLAIM_ROUTE } from '../flow.config';

const stepName = 'start-now';

const headerModel = buildHeaderModel({
  xuiBaseUrl: 'http://pcs-api-aat.service.core-compute-aat.internal',
  user: { roles: ['caseworker-civil'] },
});
// Override default assetsPath to match where webpack copies the assets
headerModel.assetsPath = '/assets/ui-component-lib';

const footerModel = buildFooterModel();


export const step: StepDefinition = {
  url: `${PROFESSIONAL_RESPOND_TO_CLAIM_ROUTE}/start-now`,
  name: stepName,
  view: 'respond-to-claim/start-now/startNow.njk',
  stepDir: __dirname,
  getController: () => {
    return createGetController(
      'professional-respond-to-claim/start-now/startNow.njk',
      stepName,
      (req: Request) => {
        return {
          backUrl: getDashboardUrl(req.res?.locals.validatedCase?.id),
          headerModel,
          footerModel,
        };
      },
      'professionalRespondToClaim'
    );
  },
  postController: {
    post: async (req: Request, res: Response) => {
      // Get next step URL and redirect
      const redirectPath = await professionalStepNavigation.getNextStepUrl(req, stepName, req.body);


      if (!redirectPath) {
        // No next step defined - show not found page
        return res.status(404).render('not-found');
      }

      res.redirect(303, redirectPath);
    },
  },
};
