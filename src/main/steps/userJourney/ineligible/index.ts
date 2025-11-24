import { createGetController } from '../../../app/controller/controllerFactory';
import { createGenerateContent } from '../../../app/utils/i18n';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';

const stepName = 'ineligible';
const generateContent = createGenerateContent(stepName, 'userJourney');

export const step: StepDefinition = {
  url: '/steps/user-journey/ineligible',
  name: stepName,
  view: 'userJourney/ineligible/ineligible.njk',
  stepDir: __dirname,
  generateContent,
  getController: () => {
    return createGetController('userJourney/ineligible/ineligible.njk', stepName, generateContent);
  },
};
