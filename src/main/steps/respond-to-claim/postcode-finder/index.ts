import { Logger } from '@hmcts/nodejs-logging';
import type { Request, Response } from 'express';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createGetController, stepNavigation } from '../../../modules/steps';
import { RESPOND_TO_CLAIM_ROUTE } from '../flow.config';

const logger = Logger.getLogger('postcode-finder');
const stepName = 'postcode-finder';

export const step: StepDefinition = {
  url: `${RESPOND_TO_CLAIM_ROUTE}/postcode-finder`,
  name: stepName,
  view: 'respond-to-claim/postcode-finder/postcodeFinder.njk',
  stepDir: __dirname,
  getController: () => {
    return createGetController(
      'respond-to-claim/postcode-finder/postcodeFinder.njk',
      stepName,
      async (req: Request) => {
        const caseReference = req.params.caseReference;
        logger.info('Postcode page logged', { caseReference });

        return {
          backUrl: await stepNavigation.getBackUrl(req, stepName),
        };
      },
      'respondToClaim'
    );
  },
  postController: {
    post: async (req: Request, res: Response) => {
      // Get next step URL and redirect
      const redirectPath = await stepNavigation.getNextStepUrl(req, stepName, req.body);

      if (!redirectPath) {
        // No next step defined - show not found page
        return res.status(404).render('not-found');
      }

      res.redirect(303, redirectPath);
    },
  },
};
