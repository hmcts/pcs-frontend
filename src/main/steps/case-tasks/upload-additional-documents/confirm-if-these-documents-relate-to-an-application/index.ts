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
  setFormData,
} from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { CANCEL_UPLOAD_ADDITIONAL_DOCUMENTS_ROUTE } from '@routes/cancelUploadAdditionalDocuments';
import { getDashboardUrl } from '@routes/dashboard';
import type { CcdCollectionItem, RelatedApplicationOption } from '@services/ccdCase.interface';
import { ccdCaseService } from '@services/ccdCaseService';
import { getFlowConfigForJourney } from '@steps';

const journeyName = 'uploadAdditionalDocuments';
const stepName = 'confirm-if-these-documents-relate-to-an-application';
const templatePath =
  'case-tasks/upload-additional-documents/confirm-if-these-documents-relate-to-an-application/confirmIfTheseDocumentsRelateToAnApplication.njk';
const UPLOAD_DOCUMENTS_EVENT_ID = 'uploadDocuments';
const MAIN_CLAIM_OPTION_VALUE = 'MAIN_CLAIM_OR_COUNTERCLAIM';

const stepNavigation = createStepNavigation(req => getFlowConfigForJourney(journeyName, req) || flowConfig);

function labelForOption(t: TFunction, option: RelatedApplicationOption): string {
  const formattedDate = option.submittedDate ? date(option.submittedDate, 'cccc d MMMM yyyy') : '';
  switch (option.category) {
    case 'ADJOURN_HEARING_APPLICATION':
      return t('applicationOptionAdjourn', { date: formattedDate });
    case 'SUSPEND_EVICTION_APPLICATION':
      return t('applicationOptionSuspend', { date: formattedDate });
    case 'SET_ASIDE_ORDER_APPLICATION':
      return t('applicationOptionSetAside', { date: formattedDate });
    case 'GENERAL_APPLICATION':
      return t('applicationOptionGeneric', { date: formattedDate });
    case 'MAIN_CLAIM_OR_COUNTERCLAIM':
      return t('optionClaimOrCounterclaim');
  }
}

async function loadRelatedApplicationOptions(req: Request): Promise<CcdCollectionItem<RelatedApplicationOption>[]> {
  const caseId = req.res?.locals.validatedCase?.id;
  const accessToken = req.session?.user?.accessToken;
  if (!caseId || !accessToken) {
    return [];
  }
  const startResponse = await ccdCaseService.getCaseByIdForEvent(accessToken, caseId, UPLOAD_DOCUMENTS_EVENT_ID);
  return startResponse.data?.relatedApplicationOptions ?? [];
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
      const savedFormData = getFormData(req, stepName);
      const selectedApplicationId = savedFormData?.relatedApplicationId as string | undefined;

      const options = await loadRelatedApplicationOptions(req);
      const applications = [
        ...options
          .filter(item => Boolean(item.value.genAppId))
          .map(item => ({
            value: item.value.genAppId as string,
            text: labelForOption(t, item.value),
            checked: selectedApplicationId === item.value.genAppId,
          })),
        {
          value: MAIN_CLAIM_OPTION_VALUE,
          text: t('optionClaimOrCounterclaim'),
          checked: selectedApplicationId === MAIN_CLAIM_OPTION_VALUE,
        },
      ];

      return {
        backUrl: getDashboardUrl(caseId) ?? '/dashboard',
        dashboardUrl: getDashboardUrl(caseId),
        cancelUrl: caseId ? CANCEL_UPLOAD_ADDITIONAL_DOCUMENTS_ROUTE.replace(':caseReference', String(caseId)) : '',
        url: req.originalUrl || '',
        applications,
      };
    }),
  postController: {
    post: async (req: Request, res: Response) => {
      const relatedApplicationId = req.body.relatedApplicationId as string | undefined;

      const t = getTranslationFunction(req);
      let relatedApplicationCategory: string | undefined;
      let relatedApplicationText = '';
      if (relatedApplicationId === MAIN_CLAIM_OPTION_VALUE) {
        relatedApplicationCategory = MAIN_CLAIM_OPTION_VALUE;
        relatedApplicationText = t('optionClaimOrCounterclaim');
      } else if (relatedApplicationId) {
        const options = await loadRelatedApplicationOptions(req);
        const match = options.find(item => item.value.genAppId === relatedApplicationId);
        if (match) {
          relatedApplicationCategory = match.value.category;
          relatedApplicationText = labelForOption(t, match.value);
        }
      }

      setFormData(req, stepName, {
        relatedApplicationId,
        relatedApplicationCategory,
        relatedApplicationText,
      });

      const redirectPath = await stepNavigation.getNextStepUrl(req, stepName);

      if (!redirectPath) {
        return res.status(404).render('not-found');
      }

      return res.redirect(303, redirectPath);
    },
  },
};
