import type { Request, Response } from 'express';

import { createGetController } from '../../../app/controller/controllerFactory';
import { TranslationContent, loadTranslations } from '../../../app/utils/loadTranslations';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { pcqRedirectMiddleware } from '../../../middleware/pcqRedirect';
import { ccdCaseService } from '../../../services/ccdCaseService';
import { SupportedLang, getValidatedLanguage } from '../../../utils/getValidatedLanguage';

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
  getController: (lang: SupportedLang = 'en') =>
    createGetController('steps/userJourney/summary.njk', stepName, generateContent(lang), req => {
      const requestLang = getValidatedLanguage(req);
      const userDetails = req.session.formData?.['enter-user-details'];
      const address = req.session.formData?.['enter-address'];
      return {
        ...generateContent(requestLang),
        userDetails,
        address,
        backUrl: '/steps/user-journey/enter-address',
        lang: requestLang,
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
