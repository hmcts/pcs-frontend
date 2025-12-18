import type { Request, Response } from 'express';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createGetController, createStepNavigation } from '../../../modules/steps';
import { respondToClaimFlowConfig } from '../flow.config';

const stepName = 'contact-preferences-telephone';
const stepNavigation = createStepNavigation(respondToClaimFlowConfig);

export const step: StepDefinition = {
  url: '/respond-to-claim/contact-preferences-telephone',
  name: stepName,
  view: 'respond-to-claim/contact-preferences-telephone/contactPreferencesTelephone.njk',
  stepDir: __dirname,
  getController: () => {
    return createGetController(
      'respond-to-claim/contact-preferences-telephone/contactPreferencesTelephone.njk',
      stepName,
      (req: Request) => {
        return {
          url: req.originalUrl || '/respond-to-claim/contact-preferences-telephone',
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
