import type { Request } from 'express';

import { UPLOAD_ADDITIONAL_DOCUMENTS_JOURNEY_BASE } from '../../../../constants/caseRoutes';
import { flowConfig } from '../flow.config';

import { createGetController, createStepNavigation } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { getDashboardUrl } from '@routes/dashboard';
import { getFlowConfigForJourney } from '@steps';

const journeyName = 'uploadAdditionalDocuments';
const stepName = 'confirm-if-these-documents-relate-to-an-application';
const templatePath =
  'case-tasks/upload-additional-documents/confirm-if-these-documents-relate-to-an-application/confirmIfTheseDocumentsRelateToAnApplication.njk';

const stepNavigation = createStepNavigation(req => getFlowConfigForJourney(journeyName, req) || flowConfig);

export const step: StepDefinition = {
  url: `${UPLOAD_ADDITIONAL_DOCUMENTS_JOURNEY_BASE}/${stepName}`,
  name: stepName,
  view: templatePath,
  stepDir: __dirname,
  getController: () =>
    createGetController(templatePath, stepName, stepNavigation, (req: Request) => ({
      backUrl: getDashboardUrl(req.res?.locals.validatedCase?.id) ?? '/dashboard',
        dashboardUrl: getDashboardUrl(req.res?.locals.validatedCase?.id),
        url: req.originalUrl || '',
        applications: [
          {
            value: 'gen-app-1',
            text: "Yes, the documents I'm uploading relate to the application to adjourn the hearing - submitted on Monday 28 April 2026",
          },
          {
            value: 'gen-app-2',
            text: "Yes, the documents I'm uploading relate to the application to set aside an order - submitted on Wednesday 16 April 2026",
          },
          {
            value: 'gen-app-3',
            text: "Yes, the documents I'm uploading relate to the application submitted on Tuesday 8 April 2026",
          },
          {
            value: 'claim-or-counterclaim',
            text: "No, the documents I'm uploading relate to the claim or counterclaim",
          },
        ],
    })),
};
