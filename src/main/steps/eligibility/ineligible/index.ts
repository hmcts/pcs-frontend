import { createGetController } from '../../../app/controller/controllerFactory';
import { TranslationContent, loadTranslations } from '../../../app/utils/loadTranslations';
import { getBackUrl } from '../../../app/utils/navigation';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';

const stepName = 'ineligible';

const generateContent = (lang = 'en'): TranslationContent => {
  return loadTranslations(lang, ['common', 'eligibility']);
};

export const step: StepDefinition = {
  url: '/steps/eligibility/ineligible',
  name: stepName,
  view: 'steps/eligibility/ineligible.njk',
  stepDir: __dirname,
  stepNumber: 0,
  section: 'eligibility',
  description: 'Ineligible page',
  generateContent,
  getController: (lang = 'en') => {
    const content = generateContent(lang);
    return createGetController('steps/eligibility/ineligible.njk', stepName, content, req => ({
      ...content,
      backUrl: getBackUrl(req, 'page2'),
    }));
  },
};
