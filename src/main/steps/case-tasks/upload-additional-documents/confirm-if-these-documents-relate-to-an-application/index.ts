import type { Request, Response } from 'express';
import type { TFunction } from 'i18next';

import { UPLOAD_ADDITIONAL_DOCUMENTS_JOURNEY_BASE } from '../../../../constants/caseRoutes';
import { flowConfig } from '../flow.config';

import { date } from '@modules/nunjucks/filters/date';
import {
  createGetController,
  createStepNavigation,
  getFormData,
  getTranslationFunction,
  loadStepNamespace,
  setFormData,
} from '@modules/steps';
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

function buildApplicationText(t: TFunction, type: GenAppType | undefined, submittedDate?: string): string {
  let formatted = '';
  if (submittedDate) {
    formatted = date(submittedDate, 'cccc d MMMM yyyy');
  }

  switch (type) {
    case GenAppType.ADJOURN:
      return t('applicationOptionAdjourn', { date: formatted });
    case GenAppType.SET_ASIDE:
      return t('applicationOptionSetAside', { date: formatted });
    case GenAppType.SOMETHING_ELSE:
    default:
      return t('applicationOptionGeneric', { date: formatted });
  }
}

export const step: StepDefinition = {
  url: `${UPLOAD_ADDITIONAL_DOCUMENTS_JOURNEY_BASE}/${stepName}`,
  name: stepName,
  view: templatePath,
  stepDir: __dirname,
  getController: () =>
    createGetController(templatePath, stepName, stepNavigation, async (req: Request) => {
      const t = getTranslationFunction(req);
      const caseId = req.res?.locals.validatedCase?.id;
      const accessToken = req.session?.user?.accessToken;
      const savedFormData = getFormData(req, stepName);
      const selectedApplicationId = savedFormData?.relatedApplicationId as string | undefined;

      const noOption = {
        value: 'claim-or-counterclaim',
        text: t('optionClaimOrCounterclaim'),
        checked: selectedApplicationId === 'claim-or-counterclaim',
      };

      let applications = [noOption];
      if (caseId && accessToken) {
        const dashboardView = await ccdCaseService.getDashboardView(accessToken, caseId);
        applications = [
          ...dashboardView.relatedApplications.map(application => ({
            value: application.id,
            text: buildApplicationText(t, application.type, application.applicationSubmittedDate),
            checked: selectedApplicationId === application.id,
          })),
          noOption,
        ];
      }
      return {
        dashboardUrl: getDashboardUrl(caseId),
        url: req.originalUrl || '',
        applications,
      };
    }),
  postController: {
    post: async (req: Request, res: Response) => {
      const relatedApplicationId = req.body.relatedApplicationId as string | undefined;

      if (!relatedApplicationId) {
        await loadStepNamespace(req);
        const getController = typeof step.getController === 'function' ? step.getController() : step.getController;
        let pageContent: Record<string, unknown> = {};
        const captureRes = {
          render: (_view: string, content: Record<string, unknown>) => {
            pageContent = content;
          },
        } as Response;

        await getController.get(req, captureRes);
        const t = pageContent.t as TFunction;
        const errorMessage = t('errors.relatedApplicationId.required');

        return res.status(400).render(templatePath, {
          ...pageContent,
          errorSummary: {
            titleText: t('errors.title'),
            errorList: [{ text: errorMessage, href: '#relatedApplicationId' }],
          },
          radioErrorMessage: { text: errorMessage },
        });
      }

      const t = getTranslationFunction(req);
      let relatedApplicationText = '';

      if (relatedApplicationId === 'claim-or-counterclaim') {
        relatedApplicationText = t('optionClaimOrCounterclaim');
      } else {
        const caseId = req.res?.locals.validatedCase?.id;
        const accessToken = req.session?.user?.accessToken;
        if (caseId && accessToken) {
          const dashboardView = await ccdCaseService.getDashboardView(accessToken, caseId);
          const app = dashboardView.relatedApplications.find(a => a.id === relatedApplicationId);
          relatedApplicationText = buildApplicationText(t, app?.type, app?.applicationSubmittedDate);
        }
      }

      setFormData(req, stepName, { relatedApplicationId, relatedApplicationText });

      const redirectPath = await stepNavigation.getNextStepUrl(req, stepName);
      if (!redirectPath) {
        return res.status(404).render('not-found');
      }

      return res.redirect(303, redirectPath);
    },
  },
};
