import type { Request, Response } from 'express';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createGetController, createStepNavigation } from '../../../modules/steps';
import { DASHBOARD_ROUTE } from '../../../routes/dashboard';
import { RESPOND_TO_CLAIM_ROUTE, flowConfig } from '../flow.config';

const stepName = 'contact-preferences-telephone';
const stepNavigation = createStepNavigation(flowConfig);

export const step: StepDefinition = {
  url: `${RESPOND_TO_CLAIM_ROUTE}/contact-preferences-telephone`,
  name: stepName,
  view: 'respond-to-claim/contact-preferences-telephone/contactPreferencesTelephone.njk',
  stepDir: __dirname,
  getController: () => {
    return createGetController(
      'respond-to-claim/contact-preferences-telephone/contactPreferencesTelephone.njk',
      stepName,
      async (req: Request) => {
        const backUrl = await stepNavigation.getBackUrl(req, stepName);
        const nextStepUrl = await stepNavigation.getNextStepUrl(req, stepName, {});
        return {
          backUrl,
          nextStepUrl,
          url: req.originalUrl,
        };
      },
      'respondToClaim'
    );
  },
  postController: {
    post: async (req: Request, res: Response) => {
      const action = req.body?.action;

      // Handle saveForLater action
      if (action === 'saveForLater') {
        return res.redirect(303, DASHBOARD_ROUTE);
      }

      // Handle continue action - go to next step
      const redirectPath = await stepNavigation.getNextStepUrl(req, stepName, req.body);

      if (!redirectPath) {
        return res.status(404).render('not-found');
      }

      // Validate redirect path to prevent open redirect vulnerability
      // Ensure it's a relative path starting with /case/ (respond-to-claim journey)
      if (!redirectPath.startsWith('/case/')) {
        return res.status(404).render('not-found');
      }

      res.redirect(303, redirectPath);
    },
  },
};
