import { StepDefinition } from 'steps/types';

import { createGetController, validateAndStoreForm } from '../../app/controller/controllerFactory';
import common from '../../assets/locales/en/common.json';
import page2Content from '../../assets/locales/en/page2.json';

const content = { ...common, ...page2Content };

export const step: StepDefinition = {
  url: '/steps/page2',
  name: 'page2',
  view: 'steps/page2.njk',
  generateContent: () => content,
  stepDir: __dirname,
  getController: createGetController('steps/page2.njk', 'page2', content),
  postController: validateAndStoreForm(
    'page2',
    [
      {
        name: 'answer',
        type: 'radio',
        required: true,
        errorMessage: content.errors.answerRequired,
      },
    ],
    body => (body.answer === 'yes' ? '/steps/page3/yes' : '/steps/page3/no'),
    content
  ),
};
