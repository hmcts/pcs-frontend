// import { buildFooterModel, buildHeaderModel } from '@hmcts-cft/cft-ui-component-lib';
import type { Request, Response } from 'express';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createGetController, createStepNavigation } from '../../../modules/steps';
import { getDashboardUrl } from '../../../routes/dashboard';
import { RESPOND_TO_CLAIM_ROUTE, flowConfig } from '../flow.config';

const stepName = 'start-now';
const stepNavigation = createStepNavigation(flowConfig);

// const headerModel = buildHeaderModel({
//   xuiBaseUrl: 'http://pcs-api-aat.service.core-compute-aat.internal',
//   user: { roles: ['caseworker-civil'] },
// });
// // Override default assetsPath to match where webpack copies the assets
// headerModel.assetsPath = '/assets/ui-component-lib';

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
      stepNavigation,
      (req: Request) => {
        return {
          backUrl: getDashboardUrl(req.res?.locals.validatedCase?.id),
          // if professional {
              // read from professional json folder
              // explodedJson = professionRespondToClaim/startNow.json (exploded)
              // overrides citizen json
            // return ...explodedJson
          // }
             claimantVisibilityInfo: "AQIBBBBB" // showing extended overrides content wth same key
          // conditional back url ,
          // footerModel,
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
