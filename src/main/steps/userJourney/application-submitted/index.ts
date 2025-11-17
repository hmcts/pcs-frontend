import type { Request, Response } from 'express';

import { createGetController } from '../../../app/controller/controllerFactory';
import { type TranslationContent, loadTranslations } from '../../../app/utils/loadTranslations';
import { getAllFormData, getNextStepUrl } from '../../../app/utils/navigation';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { type SupportedLang } from '../../../utils/getLanguageFromRequest';

const stepName = 'application-submitted';

const generateContent = (lang: SupportedLang = 'en'): TranslationContent => {
  return loadTranslations(lang, ['common', 'userJourney/applicationSubmitted']);
};

export const step: StepDefinition = {
  url: '/steps/user-journey/application-submitted',
  name: stepName,
  view: 'steps/userJourney/applicationSubmitted.njk',
  stepDir: __dirname,
  stepNumber: 4,
  section: 'completion',
  description: 'Application submitted confirmation',
  generateContent,
  getController: (lang: SupportedLang = 'en') => {
    const content = generateContent(lang);
    return createGetController('steps/userJourney/applicationSubmitted.njk', stepName, content, _req => ({
      ...content,
    }));
  },
  postController: {
    post: async (req: Request, res: Response) => {
      delete req.session.ccdCase;
      delete req.session.formData;
      delete req.session.postcodeLookupResult;

      const allFormData = getAllFormData(req);
      const nextStepUrl = getNextStepUrl(stepName, req.body, allFormData);
      res.redirect(303, nextStepUrl);
    },
  },
  getNextStep: () => 'enter-user-details',
};
