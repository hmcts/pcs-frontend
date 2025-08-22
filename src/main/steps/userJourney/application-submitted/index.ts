import type { Request, Response } from 'express';

import { createGetController } from '../../../app/controller/controllerFactory';
import { type TranslationContent, loadTranslations } from '../../../app/utils/loadTranslations';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { type SupportedLang, getValidatedLanguage } from '../../../utils/getValidatedLanguage';

const stepName = 'application-submitted';

const generateContent = (lang: SupportedLang = 'en'): TranslationContent => {
  return loadTranslations(lang, ['common', 'userJourney/applicationSubmitted']);
};

export const step: StepDefinition = {
  url: '/steps/user-journey/application-submitted',
  name: stepName,
  view: 'steps/userJourney/applicationSubmitted.njk',
  stepDir: __dirname,
  generateContent,
  getController: (lang: SupportedLang = 'en') => {
    const content = generateContent(lang);
    return createGetController('steps/userJourney/applicationSubmitted.njk', stepName, content, _req => ({
      ...content,
    }));
  },
  postController: {
    post: async (req: Request, res: Response) => {
      const lang: SupportedLang = getValidatedLanguage(req);

      delete req.session.ccdCase;
      delete req.session.formData;
      delete req.session.postcodeLookupResult;

      const redirectPath = '/steps/user-journey/enter-user-details' as const;
      const qs = new URLSearchParams({ lang }).toString();

      res.redirect(303, `${redirectPath}?${qs}`);
    },
  },
};
