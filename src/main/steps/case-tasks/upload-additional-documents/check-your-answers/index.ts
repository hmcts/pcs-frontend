import type { NextFunction, Request, Response } from 'express';

import { HTTPError } from '../../../../HttpError';
import { UPLOAD_ADDITIONAL_DOCUMENTS_JOURNEY_BASE } from '../../../../constants/caseRoutes';
import { flowConfig, uploadYourDocumentsStep } from '../flow.config';

import { sessionDocs, toDisplayDocuments } from '@modules/documents/storage';
import {
  buildUploadDocumentsPayload,
  clearUploadAdditionalDocumentsSession,
} from '@modules/steps/upload-additional-documents/buildUploadDocumentsPayload';
import { submitUploadAdditionalDocuments } from '@modules/steps/upload-additional-documents/submitUploadAdditionalDocuments';
import { createGetController, createStepNavigation, getFormData } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
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
