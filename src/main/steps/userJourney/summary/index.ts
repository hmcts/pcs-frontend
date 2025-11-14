import type { Request, Response } from 'express';

import { createGetController } from '../../../app/controller/controllerFactory';
import { TranslationContent, loadTranslations } from '../../../app/utils/loadTranslations';
import { getAllFormData, getBackUrl, getNextStepUrl } from '../../../app/utils/navigation';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { pcqRedirectMiddleware } from '../../../middleware/pcqRedirect';
import { ccdCaseService } from '../../../services/ccdCaseService';

const stepName = 'summary';

const generateContent = (lang = 'en'): TranslationContent => {
  return loadTranslations(lang, ['common', 'userJourney/summary']);
};

export const step: StepDefinition = {
  url: '/steps/user-journey/summary',
  name: stepName,
  view: 'steps/userJourney/summary.njk',
  stepDir: __dirname,
  stepNumber: 3,
  section: 'review',
  description: 'Review and submit application',
  generateContent,
  middleware: [pcqRedirectMiddleware()],
  getController: (lang = 'en') =>
    createGetController('steps/userJourney/summary.njk', stepName, generateContent(lang), req => {
      const userDetails = req.session.formData?.['enter-user-details'];
      const address = req.session.formData?.['enter-address'];
      return {
        ...generateContent(lang),
        userDetails,
        address,
        backUrl: getBackUrl(req, stepName),
        lang,
      };
    }),
  postController: {
    post: async (req: Request, res: Response) => {
      try {
        if (req.session.ccdCase && req.session.user) {
          await ccdCaseService.submitCase(req.session.user?.accessToken, req.session.ccdCase);
        }
        const allFormData = getAllFormData(req);
        const nextStepUrl = getNextStepUrl(stepName, req.body, allFormData);
        res.redirect(303, nextStepUrl);
      } catch {
        res.status(500).send('There was an error submitting your application.');
      }
    },
  },
};
