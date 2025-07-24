import { createGetController, createPostRedirectController } from '../../app/controller/controllerFactory';
import type { StepDefinition } from '../../interfaces/stepFormData.interface';

export const step: StepDefinition = {
  url: '/steps/page1',
  name: 'page1',
  view: 'steps/page1.njk',
  generateContent: (lang = 'en') => {
    const common = require(`../../../locales/${lang}/common.json`);
    const page1Content = require(`../../../locales/${lang}/page1.json`);
    return { ...common, ...page1Content };
  },
  stepDir: __dirname,
  getController: (lang = 'en') => {
    const content = step.generateContent(lang);
    return createGetController('steps/page1.njk', 'page1', content);
  },
  postController: createPostRedirectController('/steps/page2'),
};
