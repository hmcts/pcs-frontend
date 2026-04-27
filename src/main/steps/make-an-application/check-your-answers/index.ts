import type { Request, Response } from 'express';
import type { TFunction } from 'i18next';

import { createGetController, createStepNavigation, getTranslationFunction } from '../../../modules/steps';
import { ccdCaseService } from '../../../services/ccdCaseService';
import { toYesNoEnum } from '../../utils';
import { MAKE_AN_APPLICATION_ROUTE, flowConfig } from '../flow.config';

import { buildSummaryListRows } from './summaryListRowFactory';
import VisibleFormDataView from './visibleFormDataView';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { CitizenGenAppRequest } from '@services/ccdCase.interface';

const STEP_NAME = 'check-your-answers';
const stepNavigation = createStepNavigation(flowConfig);

export const step: StepDefinition = {
  url: `${MAKE_AN_APPLICATION_ROUTE}/check-your-answers`,
  name: STEP_NAME,
  view: 'make-an-application/check-your-answers/checkYourAnswers.njk',
  stepDir: __dirname,
  getController: () => {
    return createGetController(
      'make-an-application/check-your-answers/checkYourAnswers.njk',
      STEP_NAME,
      stepNavigation,
      (req: Request) => {
        const t: TFunction = getTranslationFunction(req, STEP_NAME, ['common']);

        return {
          summaryData: {
            rows: buildSummaryListRows(req, t),
          },
        };
      },
      'makeAnApplication'
    );
  },
  postController: {
    post: async (req: Request, res: Response) => {
      const formData = req.session.formData;

      const ccdCase = res.locals.validatedCase;
      if (!ccdCase) {
        throw Error('No existing case details in session');
      }

      if (!formData) {
        throw Error('No existing formData in session');
      }

      const visibleFormData = new VisibleFormDataView(req);

      const citizenGenAppRequest: CitizenGenAppRequest = {
        applicationType: visibleFormData.getApplicationTypeField()?.fieldValue,
        within14Days: toYesNoEnum(visibleFormData.getHearingInNext14DaysField()?.fieldValue),
        needHwf: toYesNoEnum(visibleFormData.getHelpWithFeesNeededField()?.fieldValue),
        appliedForHwf: toYesNoEnum(visibleFormData.getAlreadyAppliedForHwfField()?.fieldValue),
        hwfReference: visibleFormData.getHwfReferenceField()?.fieldValue,
        otherPartiesAgreed: toYesNoEnum(visibleFormData.getOtherPartiesAgreedField()?.fieldValue),
        withoutNotice: toYesNoEnum(visibleFormData.getAnyReasonsNotToShareField()?.fieldValue),
        withoutNoticeReason: visibleFormData.getReasonForNotSharingField()?.fieldValue,
        languageUsed: visibleFormData.getWhichLanguageField()?.fieldValue,
      };

      await ccdCaseService.submitGeneralApplication(req.session?.user?.accessToken, {
        id: ccdCase.id,
        data: {
          citizenGenAppRequest,
        },
      });

      delete req.session.formData;

      const redirectPath = await stepNavigation.getNextStepUrl(req, STEP_NAME, req.body);

      if (!redirectPath) {
        return res.status(500).send('Unable to determine next step');
      }

      res.redirect(303, redirectPath);
    },
  },
};
