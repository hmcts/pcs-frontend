import { createGetController, validateAndStoreForm } from 'app/controller/controllerFactory';
import { getFormData } from 'app/controller/sessionHelper';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';
import common from '../../../assets/locales/en/common.json';

const stepName = 'enter-address';

const content = { ...common, backUrl: '/steps/user-journey/enter-user-details' };

const fields: FormFieldConfig[] = [
  { name: 'street', type: 'text', required: true, errorMessage: 'Enter the street' },
  { name: 'town', type: 'text', required: true, errorMessage: 'Enter the town or city' },
  { name: 'county', type: 'text', required: true, errorMessage: 'Enter the county' },
  { name: 'postcode', type: 'text', required: true, errorMessage: 'Enter the postcode' }
];

export const step: StepDefinition = {
  url: '/steps/user-journey/enter-address',
  name: stepName,
  view: 'steps/userJourney/enterAddress.njk',
  stepDir: __dirname,
  generateContent: () => content,
  getController: createGetController(
    'steps/userJourney/enterAddress.njk',
    stepName,
    content,
    req => {
      const savedData = getFormData(req, stepName);
      return {
        ...content,
        ...savedData,
      };
    }
  ),
  postController: validateAndStoreForm(
    stepName,
    fields,
    '/steps/user-journey/summary',
    content
  )
};
