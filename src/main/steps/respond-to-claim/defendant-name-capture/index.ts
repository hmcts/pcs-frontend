import type { Request, Response } from 'express';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createGetController, createStepNavigation } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

const stepName = 'defendant-name-capture';
const stepNavigation = createStepNavigation(flowConfig);

export const step: StepDefinition = {
  url: '/respond-to-claim/defendant-name-capture',
  name: stepName,
  view: 'respond-to-claim/defendant-name-capture/defendantNameCapture.njk',
  stepDir: __dirname,
  getController: () => {
    return createGetController(
      'respond-to-claim/defendant-name-capture/defendantNameCapture.njk',
      stepName,
      (req: Request) => {
        return {
          url: req.originalUrl || '/respond-to-claim/defendant-name-capture',
        };
      },
      'respondToClaim'
    );
  },
  postController: {
    post: async (req: Request, res: Response) => {
      const redirectPath = await stepNavigation.getNextStepUrl(req, stepName, req.body);

      if (!redirectPath) {
        return res.status(404).render('not-found');
      }

      res.redirect(303, redirectPath);
    },
  },
};
