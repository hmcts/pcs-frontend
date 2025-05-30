import { createGetController, validateAndStoreForm } from 'app/controller/controllerFactory';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';
import common from '../../../assets/locales/en/common.json';

const stepName = 'enter-address';

const content = {
  ...common,
  backUrl: '/steps/user-journey/enter-user-details',
};

const fields: FormFieldConfig[] = [
  { name: 'addressLine1', type: 'text', required: true, errorMessage: 'Enter address line 1' },
  { name: 'addressLine2', type: 'text', required: false },
  { name: 'addressLine3', type: 'text', required: false },
  { name: 'town', type: 'text', required: true, errorMessage: 'Enter the town or city' },
  { name: 'county', type: 'text', required: false },
  { name: 'postcode', type: 'text', required: true, errorMessage: 'Enter the postcode' },
  { name: 'country', type: 'text', required: true, errorMessage: 'Enter the country' },
];

export const step: StepDefinition = {
  url: '/steps/user-journey/enter-address',
  name: stepName,
  view: 'steps/userJourney/enterAddress.njk',
  stepDir: __dirname,
  generateContent: () => content,
  getController: createGetController('steps/userJourney/enterAddress.njk', stepName, content),
  postController: validateAndStoreForm(stepName, fields, '/steps/user-journey/summary', content),
};
