import type { Request, Response } from 'express';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createGetController, stepNavigation } from '../../../modules/steps';

const stepName = 'application-submitted';

export const step: StepDefinition = {
  url: '/steps/user-journey/application-submitted',
  name: stepName,
  view: 'userJourney/application-submitted/applicationSubmitted.njk',
  stepDir: __dirname,
  getController: () => {
    return createGetController(
      'userJourney/application-submitted/applicationSubmitted.njk',
      stepName,
      undefined,
      'userJourney'
    );
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
