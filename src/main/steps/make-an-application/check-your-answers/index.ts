import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { createFormStep, getFormData, getTranslationFunction } from '../../../modules/steps';
import { ccdCaseService } from '../../../services/ccdCaseService';
import { toYesNoEnum } from '../../utils';
import { flowConfig } from '../flow.config';

import { buildSummaryListRows } from './summaryListRowFactory';
import VisibleFormDataView from './visibleFormDataView';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { CitizenGenAppRequest, GenAppType } from '@services/ccdCase.interface';

const STEP_NAME = 'check-your-answers';

export const step: StepDefinition = createFormStep({
  stepName: STEP_NAME,
  journeyFolder: 'makeAnApplication',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/checkYourAnswers.njk`,
  fields: [
    {
      name: 'statementOfTruthAccepted',
      type: 'checkbox',
      required: true,
      errorMessage: 'errors.agreeToTheStatementOfTruth',
      translationKey: { label: 'statementOfTruth.checkbox.fieldLabel' },
      legendClasses: 'govuk-visually-hidden',
      options: [
        {
          value: 'yes',
          translationKey: 'statementOfTruth.checkbox.value',
        },
      ],
    },
    {
      name: 'fullName',
      type: 'text',
      required: true,
      maxLength: 100,
      labelClasses: 'govuk-label--s',
      errorMessage: 'errors.youMustSignYourName',
      translationKey: {
        label: 'statementOfTruth.yourFullName',
      },
    },
  ],
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    heading: 'heading',
    statementOfTruthSubheading: 'statementOfTruth.subheading',
    theInformationFormsYourApplication: 'statementOfTruth.theInformationFormsYourApplication',
    whenYouAreSatisfied: 'statementOfTruth.whenYouAreSatisfied',
  },
  extendGetContent: async (req: Request) => {
    const t: TFunction = getTranslationFunction(req, STEP_NAME, ['common']);

    const visibleFormData = new VisibleFormDataView(req);

    const feeApplies =
      visibleFormData.getApplicationTypeField()?.fieldValue !== GenAppType.ADJOURN ||
      visibleFormData.getHearingInNext14DaysField()?.fieldValue === 'yes';

    return {
      summaryData: {
        rows: buildSummaryListRows(req, t),
      },
      buttonLabel: feeApplies ? t('buttons.continueToPayment') : t('buttons.submit'),
    };
  },
  beforeRedirect: async (req: Request) => {
    const formData = req.session.formData;

    const ccdCase = req.res?.locals.validatedCase;
    if (!ccdCase) {
      throw Error('No existing case details in session');
    }

    if (!formData) {
      throw Error('No existing formData in session');
    }

    const cyaFormData = getFormData(req, STEP_NAME);
    const statementOfTruthAccepted = (cyaFormData.statementOfTruthAccepted as string[])[0] as 'yes' | 'no';

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
      whatOrderWanted: visibleFormData.getWhatOrderWantedField()?.fieldValue,
      sotAccepted: toYesNoEnum(statementOfTruthAccepted),
      sotFullName: cyaFormData.fullName as string,
    };

    await ccdCaseService.submitGeneralApplication(req.session?.user?.accessToken, {
      id: ccdCase.id,
      data: {
        citizenGenAppRequest,
      },
    });

    delete req.session.formData;
  },
});
