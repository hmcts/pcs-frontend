import type { Request, Response } from 'express';

import { createGetController } from '../../../app/controller/controllerFactory';
import { TranslationContent, loadTranslations } from '../../../app/utils/loadTranslations';
import { getNextStepUrl } from '../../../app/utils/navigation';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';

const stepName = 'start';

const generateContent = (lang = 'en'): TranslationContent => {
  return loadTranslations(lang, ['common', 'eligibility']);
};

export const step: StepDefinition = {
  url: '/steps/eligibility/start',
  name: stepName,
  view: 'steps/eligibility/start.njk',
  stepDir: __dirname,
  stepNumber: 1,
  section: 'eligibility',
  description: 'Eligibility check start page',
  generateContent,
  getController: (lang = 'en') => {
    const content = generateContent(lang);
    return createGetController('steps/eligibility/start.njk', stepName, content, _req => ({
      ...content,
      backUrl: null,
    }));
  },
  postController: {
    post: async (req: Request, res: Response) => {
      const allFormData = {};
      const nextStepUrl = getNextStepUrl(stepName, {}, allFormData);
      res.redirect(303, nextStepUrl);
    },
  },
};
