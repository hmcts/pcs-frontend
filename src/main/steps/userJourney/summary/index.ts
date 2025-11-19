import type { Request, Response } from 'express';

import { createGetController } from '../../../app/controller/controllerFactory';
import { createGenerateContent } from '../../../app/utils/createGenerateContent';
import { getValidatedLanguage } from '../../../app/utils/getValidatedLanguage';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { pcqRedirectMiddleware } from '../../../middleware/pcqRedirect';
import { ccdCaseService } from '../../../services/ccdCaseService';

const stepName = 'summary';
const generateContent = createGenerateContent(stepName, 'userJourney');

export const step: StepDefinition = {
  url: '/steps/user-journey/summary',
  name: stepName,
  view: 'steps/userJourney/summary.njk',
  stepDir: __dirname,
  generateContent,
  middleware: [pcqRedirectMiddleware()],
  getController: () =>
    createGetController('steps/userJourney/summary.njk', stepName, generateContent('en'), req => {
      const lang = getValidatedLanguage(req);
      const content = generateContent(lang);
      const userDetails = req.session.formData?.['enter-user-details'];
      const address = req.session.formData?.['enter-address'];
      return {
        ...content,
        userDetails,
        address,
        backUrl: '/steps/user-journey/enter-address',
      };
    }),
  postController: {
    post: async (req: Request, res: Response) => {
      try {
        if (req.session.ccdCase && req.session.user) {
          await ccdCaseService.submitCase(req.session.user?.accessToken, req.session.ccdCase);
        }
        const redirectPath = '/steps/user-journey/application-submitted' as const;

        res.redirect(303, redirectPath);
      } catch {
        res.status(500).send('There was an error submitting your application.');
      }
    },
  },
};
