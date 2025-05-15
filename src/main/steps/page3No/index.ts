import { createGetController, createPostRedirectController } from '../../app/controller/controllerFactory';
import page3NoContent from '../../assets/locales/en/page3No.json';
import common from '../../assets/locales/en/common.json';
import { StepDefinition } from 'steps/types';

const content = { ...common, ...page3NoContent };

export const step: StepDefinition = {
  url: '/steps/page3/no',
  name: 'page3No',
  view: 'steps/page3No/template.njk',
   generateContent: () => content,
  stepDir: __dirname,
  getController: createGetController(__dirname, 'page3No', content),
  postController: createPostRedirectController('/steps/page1')
};
