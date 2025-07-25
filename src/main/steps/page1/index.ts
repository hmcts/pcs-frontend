import { createGetController, createPostRedirectController } from '../../app/controller/controllerFactory';
import { TranslationContent, loadTranslations } from '../../app/utils/loadTranslations';
import type { StepDefinition } from '../../interfaces/stepFormData.interface';

const generateContent = (lang = 'en'): TranslationContent => {
  return loadTranslations(lang, ['common', 'page1']);
};

export const step: StepDefinition = {
  url: '/steps/page1',
  name: 'page1',
  view: 'steps/page1.njk',
  generateContent,
  stepDir: __dirname,
  getController: (lang = 'en') => {
    const content = step.generateContent(lang);
    return createGetController('steps/page1.njk', 'page1', content);
  },
  postController: createPostRedirectController('/steps/page2'),
};
