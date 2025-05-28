import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createGetController, validateAndStoreForm } from 'app/controller/controllerFactory';
import common from 'assets/locales/en/common.json';

const content = { ...common, ...pageContent };

export const step: StepDefinition = {
  url: '/user-journey/enter-user-details',
  name: 'enter-user-details',
  view: 'steps/userJourney/enter-user-details/template.njk',
  generateContent: () => content,
  stepDir: __dirname,
  getController: createGetController('steps/userJourney/enter-user-details/template.njk', 'enter-user-details', content),
  postController: validateAndStoreForm('enter-user-details', [{ name: 'firstName', type: 'text', required: true }], '/user-journey/enter-address', content),
};
