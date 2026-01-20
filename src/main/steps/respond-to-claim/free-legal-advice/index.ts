import type { Request, Response } from 'express';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createGetController, stepNavigation } from '../../../modules/steps';
import { RESPOND_TO_CLAIM_ROUTE } from '../flow.config';

const stepName = 'free-legal-advice';

export const step: StepDefinition = {
  url: `${RESPOND_TO_CLAIM_ROUTE}/free-legal-advice`,
  name: stepName,
  view: 'respond-to-claim/free-legal-advice/freeLegalAdvice.njk',
  stepDir: __dirname,
  getController: () => {
    return createGetController(
      'respond-to-claim/free-legal-advice/freeLegalAdvice.njk',
      stepName,
      (req: Request) => {
        return {
          backUrl: stepNavigation.getBackUrl(req, stepName),
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
