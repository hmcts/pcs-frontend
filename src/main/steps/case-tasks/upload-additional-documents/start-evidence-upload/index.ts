import type { Request, Response } from 'express';

import { UPLOAD_ADDITIONAL_DOCUMENTS_JOURNEY_BASE } from '../../../../constants/caseRoutes';
import { flowConfig } from '../flow.config';

import { createGetController, createStepNavigation } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { getDashboardUrl } from '@routes/dashboard';
import { getFlowConfigForJourney } from '@steps';

const journeyName = 'uploadAdditionalDocuments';
const stepName = 'start-evidence-upload';
const templatePath = 'case-tasks/upload-additional-documents/start-evidence-upload/startEvidenceUpload.njk';
const stepNavigation = createStepNavigation(req => getFlowConfigForJourney(journeyName, req) || flowConfig);

export const step: StepDefinition = {
  url: `${UPLOAD_ADDITIONAL_DOCUMENTS_JOURNEY_BASE}/${stepName}`,
  name: stepName,
  view: templatePath,
  stepDir: __dirname,
  getController: () =>
    createGetController(
      templatePath,
      stepName,
      stepNavigation,
      (req: Request) => ({
        backUrl: getDashboardUrl(req.res?.locals.validatedCase?.id) ?? '/dashboard',
        dashboardUrl: getDashboardUrl(req.res?.locals.validatedCase?.id),
        url: req.originalUrl || '',
      }),
      journeyName
    ),
  postController: {
    post: async (req: Request, res: Response) => {
      const redirectPath = await stepNavigation.getNextStepUrl(req, stepName);

      if (!redirectPath) {
        return res.status(404).render('not-found');
      }

      res.redirect(303, redirectPath);
    },
  },
};
