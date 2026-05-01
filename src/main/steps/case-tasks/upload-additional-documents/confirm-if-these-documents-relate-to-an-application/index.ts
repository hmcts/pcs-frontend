import type { Request } from 'express';

import { UPLOAD_ADDITIONAL_DOCUMENTS_JOURNEY_BASE } from '../../../../constants/caseRoutes';
import { flowConfig } from '../flow.config';

import { createGetController, createStepNavigation } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { getDashboardUrl } from '@routes/dashboard';
import { getFlowConfigForJourney } from '@steps';

const journeyName = 'uploadAdditionalDocuments';
const stepName = 'confirm-if-these-documents-relate-to-an-application';
const stepNavigation = createStepNavigation(req => getFlowConfigForJourney(journeyName, req) || flowConfig);

export const step: StepDefinition = {
  url: `${UPLOAD_ADDITIONAL_DOCUMENTS_JOURNEY_BASE}/${stepName}`,
  name: stepName,
  view: 'upload-additional-documents/confirm-if-these-documents-relate-to-an-application.njk',
  stepDir: __dirname,
  getController: () =>
    createGetController(
      'upload-additional-documents/confirm-if-these-documents-relate-to-an-application.njk',
      stepName,
      stepNavigation,
      (req: Request) => ({
        dashboardUrl: getDashboardUrl(req.res?.locals.validatedCase?.id),
      }),
      'uploadAdditionalDocuments'
    ),
};
