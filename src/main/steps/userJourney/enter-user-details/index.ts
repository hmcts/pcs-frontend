import { createGetController, validateAndStoreForm } from 'app/controller/controllerFactory';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';
import common from '../../../assets/locales/en/common.json';

const stepName = 'enter-user-details';

const content = { ...common };

const fields: FormFieldConfig[] = [
  { name: 'title', type: 'text', required: true, errorMessage: 'Select a title' },
  { name: 'firstName', type: 'text', required: true, errorMessage: 'Enter your first name' },
  { name: 'lastName', type: 'text', required: true, errorMessage: 'Enter your last name' }
];

export const step: StepDefinition = {
  url: '/steps/user-journey/enter-user-details',
  name: stepName,
  view: 'steps/userJourney/enterUserDetails.njk',
  stepDir: __dirname,
  generateContent: () => (content),
  getController: createGetController('steps/userJourney/enterUserDetails.njk', stepName, content),
  postController: validateAndStoreForm(stepName, fields, '/steps/user-journey/enter-address', content)
};
