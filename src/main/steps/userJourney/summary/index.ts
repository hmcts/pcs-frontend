import type { Request, Response } from 'express';

import { createGetController, createPostController } from '../../../app/controller/controllerFactory';
import { createGenerateContent } from '../../../app/utils/i18n';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { pcqRedirectMiddleware } from '../../../middleware/pcqRedirect';
import { ccdCaseService } from '../../../services/ccdCaseService';

const stepName = 'summary';
const generateContent = createGenerateContent(stepName, 'userJourney');

export const step: StepDefinition = {
  url: '/steps/user-journey/summary',
  name: stepName,
  view: 'steps/userJourney/summary.njk',
  stepDir: __dirname,
  generateContent,
  middleware: [pcqRedirectMiddleware()],
  getController: () =>
    createGetController('steps/userJourney/summary.njk', stepName, generateContent, (req, _content) => {
      const userDetails = req.session.formData?.['enter-user-details'];
      const address = req.session.formData?.['enter-address'];
      return {
        userDetails,
        address,
      };
    }),
  postController: createPostController(
    stepName,
    generateContent,
    () => [], // No validation fields for summary
    'steps/userJourney/summary.njk',
    async (req: Request, res: Response) => {
      try {
        if (req.session.ccdCase && req.session.user) {
          await ccdCaseService.submitCase(req.session.user?.accessToken, req.session.ccdCase);
        }
      } catch {
        res.status(500).send('There was an error submitting your application.');
        return;
      }
    }
  ),
};
