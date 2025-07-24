import type { Request, Response } from 'express';

import { createGetController } from '../../../app/controller/controllerFactory';
import { TranslationContent, loadTranslations } from '../../../app/utils/loadTranslations';
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
        backUrl: `/steps/user-journey/enter-address?lang=${lang}`,
      };
    }),
  postController: {
    post: async (req: Request, res: Response) => {
      try {
        const lang = req.query.lang?.toString() || 'en';
        if (req.session.ccdCase && req.session.user) {
          await ccdCaseService.submitCase(req.session.user?.accessToken, req.session.ccdCase);
        }
        res.redirect(`/steps/user-journey/application-submitted?lang=${lang}`);
      } catch {
        res.status(500).send('There was an error submitting your application.');
      }
    },
  },
};
