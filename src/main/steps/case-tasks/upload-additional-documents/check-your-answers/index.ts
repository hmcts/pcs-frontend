import type { Request, Response } from 'express';

import { UPLOAD_ADDITIONAL_DOCUMENTS_JOURNEY_BASE } from '../../../../constants/caseRoutes';
import { flowConfig, uploadYourDocumentsStep } from '../flow.config';

import { sessionDocs, toDisplayDocuments } from '@modules/documents/storage';
import { Logger } from '@modules/logger';
import { createGetController, createStepNavigation, getFormData } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { getDashboardUrl } from '@routes/dashboard';
import { ccdCaseService } from '@services/ccdCaseService';
import { getFlowConfigForJourney } from '@steps';
import { toCaseReference16 } from '@utils/caseReference';

const logger = Logger.getLogger('uploadAdditionalDocumentsCheckYourAnswers');

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
    post: async (req: Request, res: Response) => {
      const caseId = req.res?.locals.validatedCase?.id;
      if (!caseId) {
        logger.error('CYA submit: validatedCase missing — middleware not executed');
        return res.status(500).render('error', { error: 'Internal server error' });
      }

      const uploadedAdditionalDocuments = await uploadStorage.read(req);
      const confirmData = getFormData(req, 'confirm-if-these-documents-relate-to-an-application');
      const relatedApplicationId = confirmData?.relatedApplicationId as string | undefined;
      const selectedRelatedApplicationId =
        relatedApplicationId && relatedApplicationId !== 'MAIN_CLAIM_OR_COUNTERCLAIM'
          ? relatedApplicationId
          : undefined;

      try {
        await ccdCaseService.submitUploadDocuments(req.session?.user?.accessToken, {
          id: caseId,
          data: { uploadedAdditionalDocuments, selectedRelatedApplicationId },
        });

        const caseRef = toCaseReference16(req.params?.caseReference);
        if (caseRef && req.session.uploadedDocs?.[caseRef]) {
          delete req.session.uploadedDocs[caseRef];
        }
      } catch (error) {
        logger.error(`Failed to submit uploadDocuments for case ${caseId}: ${String(error)}`);
        throw error;
      }

      const redirectPath = await stepNavigation.getNextStepUrl(req, stepName);
      if (!redirectPath) {
        return res.status(404).render('not-found');
      }
      res.redirect(303, redirectPath);
    },
  },
};
