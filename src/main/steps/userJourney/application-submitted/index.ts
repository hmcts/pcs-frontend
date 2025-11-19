import type { Request, Response } from 'express';

import { createGetController } from '../../../app/controller/controllerFactory';
import { createGenerateContent } from '../../../app/utils/createGenerateContent';
import { stepNavigation } from '../../../app/utils/stepNavigation';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';

const stepName = 'application-submitted';
const generateContent = createGenerateContent(stepName, 'userJourney');

export const step: StepDefinition = {
  url: '/steps/user-journey/application-submitted',
  name: stepName,
  view: 'steps/userJourney/applicationSubmitted.njk',
  stepDir: __dirname,
  generateContent,
  getController: () => {
    return createGetController('steps/userJourney/applicationSubmitted.njk', stepName, generateContent);
  },
  postController: {
    post: async (req: Request, res: Response) => {
      delete req.session.ccdCase;
      delete req.session.formData;
      delete req.session.postcodeLookupResult;

      // Redirect to start of journey
      const redirectPath = stepNavigation.getStepUrl('enter-user-details');
      res.redirect(303, redirectPath);
    },
  },
};
