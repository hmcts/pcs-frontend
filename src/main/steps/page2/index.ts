import { createGetController, validateAndStoreForm } from '../../app/controller/controllerFactory';
import page2Content from '../../assets/locales/en/page2.json';
import common from '../../assets/locales/en/common.json';
import { StepDefinition } from 'steps/types';

const content = { ...common, ...page2Content };

export const step: StepDefinition = {
  url: '/steps/page2',
  name: 'page2',
  view: 'steps/page2/template.njk',
  generateContent: () => content,
  stepDir: __dirname,
  getController: createGetController(__dirname, 'page2', content),
  postController: validateAndStoreForm('page2', [
    {
      name: 'answer',
      type: 'radio',
      required: true,
      errorMessage: content.errors.answerRequired
    }
  ], (body) => body.answer === 'yes' ? '/steps/page3/yes' : '/steps/page3/no', content)
};
