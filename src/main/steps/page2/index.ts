import Page2GetController from './get';
import Page2PostController from './post';
import { generateContent } from './content';

export const step = {
  url: '/steps/page2',
  name: 'page2',
  view: 'steps/page2/template.njk',
  generateContent,
  stepDir: __dirname,
  getController: new Page2GetController('steps/page2/template.njk'),
  postController: new Page2PostController(['yes', 'no'])
};
