import type { Request, Response } from 'express';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createGetController, stepNavigation } from '../../../modules/steps';
import { RESPOND_TO_CLAIM_ROUTE } from '../flow.config';

const stepName = 'confirmation-of-notice-given';

export const step: StepDefinition = {
  url: `${RESPOND_TO_CLAIM_ROUTE}/confirmation-of-notice-given`,
  name: stepName,
  view: 'respond-to-claim/confirmation-of-notice-given/confirmationOfNoticeGiven.njk',
  stepDir: __dirname,
  getController: () => {
    return createGetController(
      'respond-to-claim/confirmation-of-notice-given/confirmationOfNoticeGiven.njk',
      stepName,
      (req: Request) => {
        return { 
          url: req.originalUrl || `${RESPOND_TO_CLAIM_ROUTE}/confirmation-of-notice-given`,
        };
      },
        'respondToClaim'
    );
  },
  postController: {
    post: async (req: Request, res: Response) => {
      const redirectPath =  await stepNavigation.getNextStepUrl(req, stepName, req.body);

      if (!redirectPath) {              
        return res.status(404).render('not-found');
      }
        res.redirect(303, redirectPath);
    },
  },
};  