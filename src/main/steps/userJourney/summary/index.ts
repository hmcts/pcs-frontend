import type { Request, Response } from 'express';
import type { TFunction } from 'i18next';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { pcqRedirectMiddleware } from '../../../middleware/pcqRedirect';
import { createGetController, createPostController } from '../../../modules/steps';
import { ccdCaseService } from '../../../services/ccdCaseService';

const stepName = 'summary';

export const step: StepDefinition = {
  url: '/steps/user-journey/summary',
  name: stepName,
  view: 'userJourney/summary/summary.njk',
  stepDir: __dirname,
  middleware: [pcqRedirectMiddleware()],
  getController: () =>
    createGetController(
      'userJourney/summary/summary.njk',
      stepName,
      req => {
        const userDetails = req.session.formData?.['enter-user-details'];
        const address = req.session.formData?.['enter-address'];
        return {
          userDetails,
          address,
        };
      },
      'userJourney'
    ),
  postController: createPostController(
    stepName,
    (_t: TFunction) => [], // No validation fields for summary
    'userJourney/summary/summary.njk',
    async (req: Request, res: Response) => {
      try {
        if (req.session.ccdCase && req.session.user) {
          await ccdCaseService.submitCase(req.session.user?.accessToken, req.session.ccdCase);
        }
      } catch {
        res.status(500).send('There was an error submitting your application.');
        return;
      }
    },
    'userJourney'
  ),
};
