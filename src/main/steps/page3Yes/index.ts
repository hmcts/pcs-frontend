import { createGetController, validateAndStoreForm } from '../../app/controller/controllerFactory';
import page3YesContent from '../../assets/locales/en/page3Yes.json';
import common from '../../assets/locales/en/common.json';
import { StepDefinition } from 'steps/types';
import { FormFieldConfig } from 'app/controller/validation';

const content = { ...common, ...page3YesContent };

const fields: FormFieldConfig[] = [
  {
    name: 'choices',
    type: 'checkbox',
    required: true,
    errorMessage: 'You must select at least one option',
  }
];


export const step: StepDefinition = {
  url: '/steps/page3/yes',
  name: 'page3Yes',
  view: 'steps/page3Yes/template.njk',
  generateContent: () => content,
  stepDir: __dirname,
  getController: createGetController(__dirname, 'page3Yes', content),
  postController: validateAndStoreForm('page3Yes', fields, '/steps/page4', content)
};
