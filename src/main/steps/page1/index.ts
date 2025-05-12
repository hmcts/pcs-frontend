import Page1GetController from './get';
import Page1PostController from './post';
import { generateContent } from './content';

export const step = {
  url: '/steps/page1',
  name: 'page1',
  view: 'steps/page1/template.njk',
  generateContent,
  stepDir: __dirname,
  getController: new Page1GetController('steps/page1/template.njk'),
  postController: new Page1PostController()
};
