import type { Request, Response } from 'express';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createGetController, createStepNavigation } from '../../../modules/steps';
import { RESPOND_TO_CLAIM_ROUTE, flowConfig } from '../flow.config';

const stepName = 'defendant-name-confirmation';
const stepNavigation = createStepNavigation(flowConfig);

export const step: StepDefinition = {
  url: `${RESPOND_TO_CLAIM_ROUTE}/defendant-name-confirmation`,
  name: stepName,
  view: 'respond-to-claim/defendant-name-confirmation/defendantNameConfirmation.njk',
  stepDir: __dirname,
  getController: () => {
    return createGetController(
      'respond-to-claim/defendant-name-confirmation/defendantNameConfirmation.njk',
      stepName,
      (req: Request) => {
        return {
          //TODO: get defendant name from CCD case - currently served from LaunchDarkly flag
          defendantName: req.session.defendantName ?? '',
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
