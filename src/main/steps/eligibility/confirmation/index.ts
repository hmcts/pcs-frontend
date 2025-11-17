import { createGetController } from '../../../app/controller/controllerFactory';
import { TranslationContent, loadTranslations } from '../../../app/utils/loadTranslations';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';

const stepName = 'confirmation';

const generateContent = (lang = 'en'): TranslationContent => {
  return loadTranslations(lang, ['common', 'eligibility']);
};

export const step: StepDefinition = {
  url: '/steps/eligibility/confirmation',
  name: stepName,
  view: 'steps/eligibility/confirmation.njk',
  stepDir: __dirname,
  stepNumber: 8,
  section: 'eligibility',
  description: 'Eligibility confirmation',
  prerequisites: ['summary'],
  generateContent,
  getController: (lang = 'en') => {
    const content = generateContent(lang);
    return createGetController('steps/eligibility/confirmation.njk', stepName, content, _req => ({
      ...content,
      backUrl: null,
    }));
  },
};
