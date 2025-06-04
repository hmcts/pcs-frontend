import { createGetController } from 'app/controller/controllerFactory';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import common from '../../../assets/locales/en/common.json';
import type { Request, Response } from 'express';
import { ccdCaseService } from 'services/ccdCaseService';

const stepName = 'summary';
const content = { ...common, backUrl: '/steps/user-journey/enter-address'};

export const step: StepDefinition = {
  url: '/steps/user-journey/summary',
  name: stepName,
  view: 'steps/userJourney/summary.njk',
  stepDir: __dirname,
  generateContent: () => content,
  getController: createGetController(
    'steps/userJourney/summary.njk',
    stepName,
    content,
    req => {
      console.log('Session Data:', req.session?.formData);
      const userDetails = req.session.formData?.['enter-user-details'];
      const address = req.session.formData?.['enter-address'];
      return {
        ...content,
        userDetails,
        address,
      };
    }
  ),
  postController: {
    post: async (req: Request, res: Response) => {
      try {
        if (req.session.ccdCase && req.session.user) {
          console.log('CALLING SUBMIT CASE====');
          await ccdCaseService.submitCase(req.session.user, req.session.ccdCase);
        }

        res.redirect('/steps/user-journey/application-submitted');
      } catch (error) {
        console.error('Failed to submit case:', error);
        res.status(500).send('There was an error submitting your application.');
      }
    }
  }
};
