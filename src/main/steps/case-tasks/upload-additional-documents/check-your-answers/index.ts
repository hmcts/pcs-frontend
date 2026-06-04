import type { NextFunction, Request, Response } from 'express';
import type { TFunction } from 'i18next';

import { HTTPError } from '../../../../HttpError';
import { UPLOAD_ADDITIONAL_DOCUMENTS_JOURNEY_BASE } from '../../../../constants/caseRoutes';
import { flowConfig, uploadYourDocumentsStep } from '../flow.config';
import { isViewAllApplicationsAvailable } from '../flowConditions';

import { sessionDocs, toDisplayDocuments } from '@modules/documents/storage';
import { createGetController, createStepNavigation, getFormData, loadStepNamespace } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import {
  buildUploadDocumentsPayload,
  clearUploadAdditionalDocumentsSession,
} from '@modules/steps/upload-additional-documents/buildUploadDocumentsPayload';
import { submitUploadAdditionalDocuments } from '@modules/steps/upload-additional-documents/submitUploadAdditionalDocuments';
import { getDashboardUrl } from '@routes/dashboard';
import { getFlowConfigForJourney } from '@steps';

const journeyName = 'uploadAdditionalDocuments';
const stepName = 'check-your-answers';
const templatePath = 'case-tasks/upload-additional-documents/check-your-answers/checkYourAnswers.njk';
const stepNavigation = createStepNavigation(req => getFlowConfigForJourney(journeyName, req) || flowConfig);
const uploadStorage = sessionDocs({ stepName: uploadYourDocumentsStep });

export const step: StepDefinition = {
  url: `${UPLOAD_ADDITIONAL_DOCUMENTS_JOURNEY_BASE}/${stepName}`,
  name: stepName,
  view: templatePath,
  stepDir: __dirname,
  getController: () =>
    createGetController(templatePath, stepName, stepNavigation, async (req: Request) => {
      const documents = toDisplayDocuments(await uploadStorage.read(req));
      const confirmData = getFormData(req, 'confirm-if-these-documents-relate-to-an-application');
      const relatedApplicationText = (confirmData?.relatedApplicationText as string) ?? '';

      return {
        dashboardUrl: getDashboardUrl(req.res?.locals.validatedCase?.id),
        url: req.originalUrl || '',
        documents,
        relatedApplicationText,
        showRelatedApplication: await isViewAllApplicationsAvailable(req, {}, {}),
      };
    }),
  postController: {
    post: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const caseId = req.res?.locals.validatedCase?.id;
        if (!caseId) {
          return next(new HTTPError('Case not found', 404));
        }

        const accessToken = req.session.user?.accessToken;
        if (!accessToken) {
          return next(new HTTPError('Authentication required', 401));
        }

        const documents = toDisplayDocuments(await uploadStorage.read(req));
        if (documents.length === 0) {
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
          const errorMessage = t('errors.documents.required');

          return res.status(400).render(templatePath, {
            ...pageContent,
            errorSummary: {
              titleText: t('errors.title'),
              errorList: [{ text: errorMessage, href: '#documents-section' }],
            },
          });
        }

        const payload = await buildUploadDocumentsPayload(req);
        await submitUploadAdditionalDocuments(accessToken, caseId, payload);

        clearUploadAdditionalDocumentsSession(req);

        const redirectPath = await stepNavigation.getNextStepUrl(req, stepName);
        if (!redirectPath) {
          return res.status(404).render('not-found');
        }

        return res.redirect(303, redirectPath);
      } catch (error) {
        return next(error);
      }
    },
  },
};
