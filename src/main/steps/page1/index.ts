import { createGetController, createPostRedirectController } from '../../app/controller/controllerFactory';
import common from '../../assets/locales/en/common.json';
import page1Content from '../../assets/locales/en/page1.json';
import type { StepDefinition } from '../../interfaces/stepFormData.interface';

const content = { ...common, ...page1Content };

export const step: StepDefinition = {
  url: '/steps/page1',
  name: 'page1',
  view: 'steps/page1.njk',
  generateContent: () => content,
  stepDir: __dirname,
  getController: createGetController('steps/page1.njk', 'page1', content),
  postController: createPostRedirectController('/steps/page2'),
};
