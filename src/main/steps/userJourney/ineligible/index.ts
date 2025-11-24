import { createGetController } from '../../../app/controller/controllerFactory';
import { createGenerateContent } from '../../../app/utils/i18n';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';

const stepName = 'ineligible';
const generateContent = createGenerateContent(stepName, 'userJourney');

export const step: StepDefinition = {
  url: '/steps/user-journey/ineligible',
  name: stepName,
  view: 'steps/userJourney/ineligible.njk',
  stepDir: __dirname,
  generateContent,
  getController: () => {
    return createGetController('steps/userJourney/ineligible.njk', stepName, generateContent);
  },
};
