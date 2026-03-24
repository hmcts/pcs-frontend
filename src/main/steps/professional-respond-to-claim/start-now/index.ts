import type { Request, Response } from 'express';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createGetController, professionalStepNavigation } from '../../../modules/steps';
import { getDashboardUrl } from '../../../routes/dashboard';
import { PROFESSIONAL_RESPOND_TO_CLAIM_ROUTE } from '../flow.config';

const stepName = 'start-now';

export const step: StepDefinition = {
  url: `${PROFESSIONAL_RESPOND_TO_CLAIM_ROUTE}/start-now`,
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
      'professionalRespondToClaim'
    );
  },
  postController: {
    post: async (req: Request, res: Response) => {
      // Get next step URL and redirect
      const redirectPath = await professionalStepNavigation.getNextStepUrl(req, stepName, req.body);

      console.log("redirect-STARTNOW", redirectPath)

      if (!redirectPath) {
        // No next step defined - show not found page
        return res.status(404).render('not-found');
      }

      res.redirect(303, redirectPath);
    },
  },
};
