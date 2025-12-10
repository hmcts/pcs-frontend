import type { Request, Response } from 'express';

import { createGetController } from '../../../app/controller/controllerFactory';
import { createGenerateContent } from '../../../app/utils/i18n';
import { createStepNavigation } from '../../../app/utils/stepFlow';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { respondToClaimFlowConfig } from '../flow.config';

const stepName = 'postcode-finder';
const generateContent = createGenerateContent(stepName, 'respondToClaim');
const stepNavigation = createStepNavigation(respondToClaimFlowConfig);

export const step: StepDefinition = {
  url: '/respond-to-claim/postcode-finder',
  name: stepName,
  view: 'steps/respondToClaim/postcodeFinder.njk',
  stepDir: __dirname,
  generateContent,
  getController: () => {
    return createGetController('steps/respondToClaim/postcodeFinder.njk', stepName, generateContent);
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
