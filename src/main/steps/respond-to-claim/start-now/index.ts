import type { Request, Response } from 'express';

import { createGetController } from '../../../app/controller/controllerFactory';
import { getDashboardUrl } from '../../../app/utils/routes';
import { createStepNavigation } from '../../../app/utils/stepFlow';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { respondToClaimFlowConfig } from '../flow.config';

const stepName = 'start-now';
const stepNavigation = createStepNavigation(respondToClaimFlowConfig);

export const step: StepDefinition = {
  url: '/respond-to-claim/start-now',
  name: stepName,
  view: 'respond-to-claim/start-now/startNow.njk',
  stepDir: __dirname,
  getController: () => {
    return createGetController(
      'respond-to-claim/start-now/startNow.njk',
      stepName,
      (req: Request) => {
        const ccdCaseId = req.session?.ccdCase?.id;
        return {
          backUrl: getDashboardUrl(ccdCaseId),
        };
      },
      'respondToClaim'
    );
  },
  postController: {
    post: async (req: Request, res: Response) => {
      // Get next step URL and redirect
      const redirectPath = stepNavigation.getNextStepUrl(req, stepName, req.body);

      if (!redirectPath) {
        // No next step defined - show not found page
        return res.status(404).render('not-found');
      }

      res.redirect(303, redirectPath);
    },
  },
};
