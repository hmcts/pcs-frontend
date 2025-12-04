import { createGetController } from '../../../app/controller/controllerFactory';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';

const stepName = 'ineligible';

export const step: StepDefinition = {
  url: '/steps/user-journey/ineligible',
  name: stepName,
  view: 'userJourney/ineligible/ineligible.njk',
  stepDir: __dirname,
  getController: () => {
    return createGetController('userJourney/ineligible/ineligible.njk', stepName, undefined, 'userJourney');
  },
};
