import type { Request } from 'express';

import { UPLOAD_ADDITIONAL_DOCUMENTS_JOURNEY_BASE } from '../../../../constants/caseRoutes';
import { formatISOToLongDate } from '../../../utils/dateUtils';
import { flowConfig } from '../flow.config';

import { createGetController, createStepNavigation, getFormData, setFormData } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { getDashboardUrl } from '@routes/dashboard';
import { GenAppType } from '@services/ccdCase.interface';
import { ccdCaseService } from '@services/ccdCaseService';
import { getFlowConfigForJourney } from '@steps';

const journeyName = 'uploadAdditionalDocuments';
const stepName = 'confirm-if-these-documents-relate-to-an-application';
const templatePath =
  'case-tasks/upload-additional-documents/confirm-if-these-documents-relate-to-an-application/confirmIfTheseDocumentsRelateToAnApplication.njk';

const stepNavigation = createStepNavigation(req => getFlowConfigForJourney(journeyName, req) || flowConfig);

function buildApplicationText(type: GenAppType, submittedDate?: string): string {
  const formattedDate = formatISOToLongDate(submittedDate);

  switch (type) {
    case GenAppType.ADJOURN:
      return `Yes, the documents I'm uploading relate to the application to adjourn the hearing - submitted on ${formattedDate}`;
    case GenAppType.SET_ASIDE:
      return `Yes, the documents I'm uploading relate to the application to set aside the order - submitted on ${formattedDate}`;
    case GenAppType.SUSPEND:
      return `Yes, the documents I'm uploading relate to the application to suspend the eviction - submitted on ${formattedDate}`;
    case GenAppType.SOMETHING_ELSE:
    default:
      return `Yes, the documents I'm uploading relate to the application submitted on ${formattedDate}`;
  }
}

export const step: StepDefinition = {
  url: `${UPLOAD_ADDITIONAL_DOCUMENTS_JOURNEY_BASE}/${stepName}`,
  name: stepName,
  view: templatePath,
  stepDir: __dirname,
  getController: () =>
    createGetController(templatePath, stepName, stepNavigation, async (req: Request) => {
      const caseId = req.res?.locals.validatedCase?.id;
      const accessToken = req.session?.user?.accessToken;
      const savedFormData = getFormData(req, stepName);
      const selectedApplicationId = savedFormData?.relatedApplicationId as string | undefined;

      const noOption = {
        value: 'claim-or-counterclaim',
        text: "No, the documents I'm uploading relate to the main claim or counterclaim",
        checked: selectedApplicationId === 'claim-or-counterclaim',
      };

      let applications = [noOption];
      if (caseId && accessToken) {
        const dashboardView = await ccdCaseService.getDashboardView(accessToken, caseId);
        applications = [
          ...dashboardView.relatedApplications.map(application => ({
            value: application.id,
            text: buildApplicationText(application.type, application.applicationSubmittedDate),
            checked: selectedApplicationId === application.id,
          })),
          noOption,
        ];
      }
      return {
        backUrl: getDashboardUrl(caseId) ?? '/dashboard',
        dashboardUrl: getDashboardUrl(caseId),
        url: req.originalUrl || '',
        applications,
      };
    }),
  postController: {
    post: async (req, res) => {
      const relatedApplicationId = req.body.relatedApplicationId as string | undefined;

      setFormData(req, stepName, {
        relatedApplicationId,
      });

      const redirectPath = await stepNavigation.getNextStepUrl(req, stepName);

      if (!redirectPath) {
        return res.status(404).render('not-found');
      }

      return res.redirect(303, redirectPath);
    },
  },
};
