import type { Request, Response } from 'express';

import { createGetController } from '../../../app/controller/controllerFactory';
import { createGenerateContent } from '../../../app/utils/i18n';
import { createStepNavigation } from '../../../app/utils/stepFlow';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { respondToClaimFlowConfig } from '../flow.config';

const stepName = 'free-legal-advice';
const generateContent = createGenerateContent(stepName, 'respondToClaim');
const stepNavigation = createStepNavigation(respondToClaimFlowConfig);

export const step: StepDefinition = {
  url: '/respond-to-claim/free-legal-advice',
  name: stepName,
  view: 'steps/respondToClaim/freeLegalAdvice.njk',
  stepDir: __dirname,
  generateContent,
  getController: () => {
    return createGetController('steps/respondToClaim/freeLegalAdvice.njk', stepName, generateContent);
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
