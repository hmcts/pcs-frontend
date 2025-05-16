import { createGetController, createPostRedirectController } from '../../app/controller/controllerFactory';
import common from '../../assets/locales/en/common.json';
import page3NoContent from '../../assets/locales/en/page3No.json';
import type { StepDefinition } from '../../interfaces/stepFormData.interface';

const content = { ...common, ...page3NoContent };

export const step: StepDefinition = {
  url: '/steps/page3/no',
  name: 'page3No',
  view: 'steps/page3No.njk',
  generateContent: () => content,
  stepDir: __dirname,
  getController: createGetController('steps/page3No.njk', 'page3No', content),
  postController: createPostRedirectController('/steps/page1'),
};
