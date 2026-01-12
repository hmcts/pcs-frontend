import type { Request, Response } from 'express';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createGetController, createStepNavigation } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

const stepName = 'contact-preferences-text-message';
const stepNavigation = createStepNavigation(flowConfig);

export const step: StepDefinition = {
  url: '/respond-to-claim/contact-preferences-text-message',
  name: stepName,
  view: 'respond-to-claim/contact-preferences-text-message/contactPreferencesTextMessage.njk',
  stepDir: __dirname,

getController: (lang?: 'en' | 'cy') => {
  return createGetController(
    'respond-to-claim/contact-preferences-text-message/contactPreferencesTextMessage.njk',
    stepName,
    (req: Request) => {

    const content = require(
          '../../../assets/locales/en/respondToClaim/contactPreferencesTextMessage.json'
        );

      return {
        ...content,
        url: req.originalUrl || '/respond-to-claim/contact-preferences-text-message',
        contactByTextMessage: '',
        phoneNumber: '',
      };
    },
    'respondToClaim'
  );
},


  postController: {
    post: async (req: Request, res: Response) => {
      const redirectPath = stepNavigation.getNextStepUrl(req, stepName, req.body);

      if (!redirectPath) {
        return res.status(404).render('not-found');
      }

      res.redirect(303, redirectPath);
    },
  },
};
