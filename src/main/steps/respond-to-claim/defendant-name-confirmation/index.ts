import type { Request, Response } from 'express';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createGetController, createStepNavigation } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

const stepName = 'defendant-name-confirmation';
const stepNavigation = createStepNavigation(flowConfig);

export const step: StepDefinition = {
  url: '/respond-to-claim/defendant-name-confirmation',
  name: stepName,
  view: 'respond-to-claim/defendant-name-confirmation/defendantNameConfirmation.njk',
  stepDir: __dirname,
  getController: () => {
    return createGetController(
      'respond-to-claim/defendant-name-confirmation/defendantNameConfirmation.njk',
      stepName,
      (_req: Request) => {
        // TODO: Check defendant name from CCD case, currently hardcoded
        return {
          defendantName: 'John Smith',
        };
      },
      'respondToClaim'
    );
  },
  postController: {
    post: async (req: Request, res: Response) => {
      const redirectPath = stepNavigation.getNextStepUrl(req, stepName, req.body);

      if (!redirectPath) {
        return res.status(404).render('not-found');
      }

      res.redirect(303, redirectPath);
    },
  },
};
