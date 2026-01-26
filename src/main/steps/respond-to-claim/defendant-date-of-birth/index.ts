import type { Request, Response } from 'express';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createGetController, createStepNavigation } from '../../../modules/steps';
import { DASHBOARD_ROUTE } from '../../../routes/dashboard';
import { flowConfig } from '../flow.config';

const stepName = 'defendant-date-of-birth';
const stepNavigation = createStepNavigation(flowConfig);

export const step: StepDefinition = {
  url: '/respond-to-claim/defendant-date-of-birth',
  name: stepName,
  view: 'respond-to-claim/defendant-date-of-birth/defendantDateOfBirth.njk',
  stepDir: __dirname,
  getController: () => {
    return createGetController(
      'respond-to-claim/defendant-date-of-birth/defendantDateOfBirth.njk',
      stepName,
      async (req: Request) => {
        const backUrl = await stepNavigation.getBackUrl(req, stepName);
        const nextStepUrl = await stepNavigation.getNextStepUrl(req, stepName, {});
        return {
          backUrl,
          nextStepUrl,
          url: stepNavigation.getStepUrl(stepName),
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

      res.redirect(303, redirectPath);
    },
  },
};
