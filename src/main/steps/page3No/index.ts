import Page3YesGetController from './get';
import Page3YesPostController from './post';
import { generateContent } from './content';

export const step = {
  url: '/steps/page3/yes',
  name: 'page3Yes',
  view: 'steps/page3Yes/template.njk',
  generateContent,
  stepDir: __dirname,
  getController: new Page3YesGetController('steps/page3Yes/template.njk'),
  postController: new Page3YesPostController()
};

