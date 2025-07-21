import type { Request, Response } from 'express';

import { createGetController } from '../../../app/controller/controllerFactory';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';

const stepName = 'application-submitted';
const generateContent = (lang = 'en'): Record<string, string> => {
  const common = require(`../../../assets/locales/${lang}/common.json`);
  const pageContent = require(`../../../assets/locales/${lang}/userJourney/applicationSubmitted.json`);
  return { ...common, ...pageContent };
};
export const step: StepDefinition = {
  url: '/steps/user-journey/application-submitted',
  name: stepName,
  view: 'steps/userJourney/applicationSubmitted.njk',
  stepDir: __dirname,
  generateContent,
  getController: (lang = 'en') => {
    const content = generateContent(lang);
    return createGetController('steps/userJourney/applicationSubmitted.njk', stepName, content, _req => ({
      ...content,
    }));
  },
  postController: {
    post: async (req: Request, res: Response) => {
      delete req.session.ccdCase;
      delete req.session.formData;
      res.redirect('/steps/user-journey/enter-user-details');
    },
  },
};
