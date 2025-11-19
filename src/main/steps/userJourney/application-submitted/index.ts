import type { Request, Response } from 'express';

import { createGetController } from '../../../app/controller/controllerFactory';
import { createGenerateContent } from '../../../app/utils/createGenerateContent';
import { getValidatedLanguage } from '../../../app/utils/getValidatedLanguage';
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
    return createGetController('steps/userJourney/applicationSubmitted.njk', stepName, generateContent('en'), req => {
      const lang = getValidatedLanguage(req);
      return {
        ...generateContent(lang),
      };
    });
  },
  postController: {
    post: async (req: Request, res: Response) => {
      delete req.session.ccdCase;
      delete req.session.formData;
      delete req.session.postcodeLookupResult;

      const redirectPath = '/steps/user-journey/enter-user-details' as const;

      res.redirect(303, redirectPath);
    },
  },
};
