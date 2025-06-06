import type { Request, Response } from 'express';

import { createGetController } from '../../../app/controller/controllerFactory';
import common from '../../../assets/locales/en/common.json';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';

const stepName = 'application-submitted';

const content = {
  ...common,
};

export const step: StepDefinition = {
  url: '/steps/user-journey/application-submitted',
  name: stepName,
  view: 'steps/userJourney/applicationSubmitted.njk',
  stepDir: __dirname,
  generateContent: () => content,
  getController: createGetController('steps/userJourney/applicationSubmitted.njk', stepName, content),
  postController: {
    post: async (req: Request, res: Response) => {
      delete req.session.ccdCase;
      delete req.session.formData;
      res.redirect('/steps/user-journey/enter-user-details');
    },
  },
};
