import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import {
  RESPOND_TO_CLAIM_POST_SUBMIT_REDIRECT_SESSION_KEY,
  buildStatementOfTruthPayload,
  getEndOfJourneyCyaSubmitErrorPath,
  submitRespondToClaimResponse,
} from '../../utils/respondToClaimFinalSubmit';
import { createRespondToClaimFormStep } from '../formStep';
import { sectionIdToBackendEnum } from '../sections.config';

import { buildEndOfJourneyCyaSections } from './buildEndOfJourneyCyaRows';

import { getTranslationFunction, loadStepNamespaces } from '@modules/steps';
import { buildErrorSummary } from '@modules/steps/formBuilder/errorUtils';
import { FormFieldConfig } from '@modules/steps/formBuilder/formFieldConfig.interface';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

const STEP_NAME = 'end-of-journey-cya';

// Field config override for the submit error when submitting the response fails
const submitResponseErrorFields: FormFieldConfig[] = [{ name: 'submitResponse', type: 'text' }];

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: STEP_NAME,
  stepDir: __dirname,
  customTemplate: `${__dirname}/endOfJourneyCya.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    statementOfTruthHeading: 'statementOfTruth.heading',
    statementOfTruthHint: 'statementOfTruth.hint',
  },
  fields: [
    {
      name: 'statementOfTruthContempt',
      type: 'checkbox',
      required: (_formData, _allData, req) => req?.res?.locals.isLegalRepresentative !== true,
      errorMessage: 'errors.statementOfTruthContempt',
      translationKey: { label: 'statementOfTruth.contemptFieldLabel' },
      legendClasses: 'govuk-visually-hidden',
      options: [{ value: 'yes', translationKey: 'statementOfTruth.contemptOption' }],
    },
    {
      name: 'statementOfTruthBelief',
      type: 'checkbox',
      required: true,
      errorMessage: 'errors.statementOfTruthBelief',
      translationKey: { label: 'statementOfTruth.beliefFieldLabel' },
      legendClasses: 'govuk-visually-hidden',
      options: [{ value: 'yes', translationKey: 'statementOfTruth.beliefOption' }],
    },
    {
      name: 'fullName',
      type: 'text',
      required: true,
      maxLength: 100,
      errorMessage: 'errors.fullName',
      translationKey: { label: 'statementOfTruth.fullNameLabel' },
    },
    {
      name: 'nameOfFirm',
      type: 'text',
      required: (_formData, _allData, req) => req?.res?.locals.isLegalRepresentative === true,
      maxLength: 100,
      errorMessage: 'errors.nameOfFirm',
      translationKey: { label: 'statementOfTruth.nameOfFirmLabel' },
    },
    {
      name: 'positionHeld',
      type: 'text',
      required: (_formData, _allData, req) => req?.res?.locals.isLegalRepresentative === true,
      maxLength: 100,
      errorMessage: 'errors.positionHeld',
      translationKey: { label: 'statementOfTruth.positionHeldLabel' },
    },
  ],
  getInitialFormData: (req: Request) => {
    const sot = req.res?.locals.validatedCase?.possessionClaimResponse?.defendantResponses?.statementOfTruth;
    const accepted = sot?.accepted === 'YES';
    const fullName = sot?.fullName;
    const nameOfFirm = sot?.nameOfFirm;
    const positionHeld = sot?.positionHeld;
    return {
      ...(accepted ? { statementOfTruthContempt: ['yes'], statementOfTruthBelief: ['yes'] } : {}),
      ...(fullName ? { fullName } : {}),
      ...(nameOfFirm ? { nameOfFirm } : {}),
      ...(positionHeld ? { positionHeld } : {}),
    };
  },
  extendGetContent: async (req: Request, _formContent) => {
    await loadStepNamespaces(
      req,
      [
        'checkYourAnswersStartNowAndDetails',
        'checkYourAnswersPersonalDetails',
        'checkYourAnswersYourResponse',
        'checkYourAnswersPaymentsAndAgreements',
        'checkYourAnswersYourCircumstances',
        'checkYourAnswersIncomeAndExpenses',
        'checkYourAnswersDocuments',
        'checkYourAnswers',
      ],
      'respondToClaim'
    );
    const t: TFunction = getTranslationFunction(req, ['common']);
    const sections = buildEndOfJourneyCyaSections(req, t);
    const status = req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.status;
    const submitDisabled = status === 'SUBMITTED';
    const isLegalRepresentative = req.res?.locals.isLegalRepresentative === true;

    if (req.query.submitError !== 'failed') {
      return { sections, submitDisabled, isLegalRepresentative };
    }

    const tError = getTranslationFunction(req, ['respondToClaim/checkYourAnswers', 'common']);
    const translated = tError('errors.submitResponseFailed');
    const message =
      translated && translated !== 'errors.submitResponseFailed'
        ? translated
        : 'Failed to submit response. Please try again.';

    const errorSummary = buildErrorSummary({ submitResponse: message }, submitResponseErrorFields, tError);

    return { sections, submitDisabled, isLegalRepresentative, ...(errorSummary ? { errorSummary } : {}) };
  },
  beforeRedirect: async (req: Request) => {
    const draft = buildDraftDefendantResponse(req);
    const isLegalRepresentative = req.res?.locals.isLegalRepresentative === true;

    draft.defendantResponses.statementOfTruth = buildStatementOfTruthPayload(req.body, isLegalRepresentative);

    const enumValue = sectionIdToBackendEnum('checkYourAnswersAndSubmit');
    const current = draft.defendantResponses.completedSections ?? [];
    if (!current.includes(enumValue)) {
      draft.defendantResponses.completedSections = [...current, enumValue];
    }
    await saveDraftDefendantResponse(req, draft);

    const caseId = req.res?.locals.validatedCase?.id;
    if (!caseId) {
      req.session[RESPOND_TO_CLAIM_POST_SUBMIT_REDIRECT_SESSION_KEY] = getEndOfJourneyCyaSubmitErrorPath(
        String(req.params?.caseReference ?? '')
      );
      return;
    }

    try {
      const { confirmationPath } = await submitRespondToClaimResponse(req);
      req.session[RESPOND_TO_CLAIM_POST_SUBMIT_REDIRECT_SESSION_KEY] = confirmationPath;
    } catch {
      req.session[RESPOND_TO_CLAIM_POST_SUBMIT_REDIRECT_SESSION_KEY] = getEndOfJourneyCyaSubmitErrorPath(caseId);
    }
  },
  resolveRedirectAfterPost: async (req: Request) => {
    const redirectPath = req.session[RESPOND_TO_CLAIM_POST_SUBMIT_REDIRECT_SESSION_KEY] as string | undefined;
    delete req.session[RESPOND_TO_CLAIM_POST_SUBMIT_REDIRECT_SESSION_KEY];
    return redirectPath;
  },
});
