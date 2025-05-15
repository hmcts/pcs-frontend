import { createGetController, createPostRedirectController } from '../../app/controller/controllerFactory';
import page1Content from '../../assets/locales/en/page1.json';
import common from '../../assets/locales/en/common.json';

const content = { ...common, ...page1Content };

export const step = {
  url: '/steps/page1',
  name: 'page1',
  view: 'steps/page1/template.njk',
  generateContent: () => content,
  stepDir: __dirname,
  getController: createGetController(__dirname, 'page1', content),
  postController: createPostRedirectController('/steps/page2')
};
