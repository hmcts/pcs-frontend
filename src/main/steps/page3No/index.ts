import { generateContent } from './content';
import Page3NoGetController from './get';
import Page3NoPostController from './post';

export const step = {
  url: '/steps/page3/no',
  name: 'page3No',
  view: 'steps/page3No/template.njk',
  generateContent,
  stepDir: __dirname,
  getController: new Page3NoGetController('steps/page3No/template.njk'),
  postController: new Page3NoPostController()
};

