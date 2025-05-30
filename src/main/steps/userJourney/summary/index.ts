import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createGetController } from 'app/controller/controllerFactory';
import { getFormData } from 'app/controller/sessionHelper';
import common from '../../../assets/locales/en/common.json';

const content = { ...common, backUrl: '/steps/user-journey/enter-address'};

export const step: StepDefinition = {
  url: '/steps/user-journey/summary',
  name: 'summary',
  view: 'steps/userJourney/summary.njk',
  stepDir: __dirname,
  generateContent: () => content,
  getController: createGetController('steps/userJourney/summary.njk', 'summary', content, req => {
    console.log('Session Data:', req.session?.formData);
    const userDetails = getFormData(req, 'enter-user-details');
    const address = getFormData(req, 'enter-address');
    return {
      ...content,
      userDetails,
      address,
    };
  })
};
