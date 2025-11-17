import type { Request, Response } from 'express';

import { createGetController } from '../../../app/controller/controllerFactory';
import { TranslationContent, loadTranslations } from '../../../app/utils/loadTranslations';
import { getAllFormData, getBackUrl, getNextStepUrl } from '../../../app/utils/navigation';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';

const stepName = 'summary';

const generateContent = (lang = 'en'): TranslationContent => {
  return loadTranslations(lang, ['common', 'eligibility']);
};

export const step: StepDefinition = {
  url: '/steps/eligibility/summary',
  name: stepName,
  view: 'steps/eligibility/summary.njk',
  stepDir: __dirname,
  stepNumber: 7,
  section: 'eligibility',
  description: 'Review eligibility answers',
  prerequisites: ['correspondence-address'],
  generateContent,
  getController: (lang = 'en') => {
    const content = generateContent(lang);
    return createGetController('steps/eligibility/summary.njk', stepName, content, req => {
      const allFormData = getAllFormData(req);
      return {
        ...content,
        ...allFormData,
        backUrl: getBackUrl(req, stepName),
      };
    });
  },
  postController: {
    post: async (req: Request, res: Response) => {
      const allFormData = getAllFormData(req);
      const nextStepUrl = getNextStepUrl(stepName, {}, allFormData);
      res.redirect(303, nextStepUrl);
    },
  },
};
