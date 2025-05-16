import { createGetController } from '../../app/controller/controllerFactory';
import page4Content from '../../assets/locales/en/page4.json';
import common from '../../assets/locales/en/common.json';
import { getFormData } from '../../app/controller/sessionHelper';
import { StepDefinition } from 'steps/types';

const content = { ...common, ...page4Content };

export const step: StepDefinition = {
  url: '/steps/page4',
  name: 'page4',
  view: 'steps/page4.njk',
  generateContent: () => content,
  stepDir: __dirname,
  getController: createGetController('steps/page4.njk', 'page4', content, (req) => {
    const page2 = getFormData(req, 'page2');
    const page3Yes = getFormData(req, 'page3Yes');
    return {
      ...content,
      answer: page2?.answer,
      choices: page3Yes?.choices?.join(', ') || 'None selected'
    };
  })
};
