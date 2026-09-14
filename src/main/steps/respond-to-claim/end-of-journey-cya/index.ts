import config from 'config';
import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import {
  RESPOND_TO_CLAIM_POST_SUBMIT_REDIRECT_SESSION_KEY,
  RESPOND_TO_CLAIM_SUBMIT_REJECTION_SESSION_KEY,
  RespondToClaimSubmitRejectedError,
  buildStatementOfTruthPayload,
  getEndOfJourneyCyaDraftChangedPath,
  getEndOfJourneyCyaSubmitErrorPath,
  isDraftChangedError,
  submitRejectionReason,
  submitRespondToClaimResponse,
} from '../../utils/respondToClaimFinalSubmit';
import { createRespondToClaimFormStep } from '../formStep';
import { sectionIdToBackendEnum } from '../sections.config';

import { buildEndOfJourneyCyaSections } from './buildEndOfJourneyCyaRows';

import { getTranslationFunction, loadStepNamespaces } from '@modules/steps';
import { buildErrorSummary } from '@modules/steps/formBuilder/errorUtils';
import { FormFieldConfig } from '@modules/steps/formBuilder/formFieldConfig.interface';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { getDashboardUrl } from '@routes/dashboard';

const STEP_NAME = 'end-of-journey-cya';

// Field config override for the submit error when submitting the response fails
const submitResponseErrorFields: FormFieldConfig[] = [{ name: 'submitResponse', type: 'text' }];

export function getStatementOfTruthInitialFormData(req: Request): Record<string, unknown> {
  const sot = req.res?.locals.validatedCase?.possessionClaimResponse?.defendantResponses?.statementOfTruth;
  const accepted = sot?.accepted === 'YES' && req.query?.draftChanged !== '1';
  const fullName = sot?.fullName;
  const nameOfFirm = sot?.nameOfFirm;
  const positionHeld = sot?.positionHeld;
  return {
    ...(accepted ? { statementOfTruthContempt: ['yes'], statementOfTruthBelief: ['yes'] } : {}),
    ...(fullName ? { fullName } : {}),
    ...(nameOfFirm ? { nameOfFirm } : {}),
    ...(positionHeld ? { positionHeld } : {}),
  };
}

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
  getInitialFormData: getStatementOfTruthInitialFormData,
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

    const caseId = req.res?.locals.validatedCase?.id;
    let dashboardUrl = getDashboardUrl(caseId);

    if (isLegalRepresentative && caseId) {
      const caseDetailsBaseUrl = config.has('redirects.manageCaseReturnURL')
        ? config.get<string>('redirects.manageCaseReturnURL')
        : null;
      if (caseDetailsBaseUrl) {
        dashboardUrl = `${caseDetailsBaseUrl}/${caseId}`;
      }
    }

    const draftVersion = req.res?.locals.validatedCase?.data?.possessionClaimResponse?.draftVersion ?? '';
    const base = { sections, submitDisabled, isLegalRepresentative, dashboardUrl, draftVersion };

    const draftChanged = req.query.draftChanged === '1';
    if (req.query.submitError !== 'failed' && !draftChanged) {
      return base;
    }

    const tError = getTranslationFunction(req, ['respondToClaim/checkYourAnswers', 'common']);

    const rejection = req.session[RESPOND_TO_CLAIM_SUBMIT_REJECTION_SESSION_KEY];
    delete req.session[RESPOND_TO_CLAIM_SUBMIT_REJECTION_SESSION_KEY];
    if (!draftChanged && rejection === 'correspondenceAddress' && caseId) {
      const title = tError('errors.title');
      const text = tError('errors.correspondenceAddressRejected');
      const errorSummary = {
        titleText: title && title !== 'errors.title' ? title : 'There is a problem',
        errorList: [
          {
            text:
              text && text !== 'errors.correspondenceAddressRejected'
                ? text
                : 'Check the correspondence address you entered and try again.',
            href: `/case/${caseId}/respond-to-claim/correspondence-address`,
          },
        ],
      };
      return { ...base, errorSummary };
    }

    const errorKey = draftChanged ? 'errors.draftChanged' : 'errors.submitResponseFailed';
    const fallback = draftChanged
      ? 'Your answers have changed since you reviewed them. Check them and confirm again.'
      : 'Failed to submit response. Please try again.';
    const translated = tError(errorKey);
    const message = translated && translated !== errorKey ? translated : fallback;

    const errorSummary = buildErrorSummary({ submitResponse: message }, submitResponseErrorFields, tError);

    return { ...base, ...(errorSummary ? { errorSummary } : {}) };
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
    const caseId = req.res?.locals.validatedCase?.id;

    try {
      await saveDraftDefendantResponse(req, draft);
    } catch (error) {
      if (caseId && isDraftChangedError(error)) {
        req.session[RESPOND_TO_CLAIM_POST_SUBMIT_REDIRECT_SESSION_KEY] = getEndOfJourneyCyaDraftChangedPath(caseId);
        return;
      }
      throw error;
    }

    if (!caseId) {
      req.session[RESPOND_TO_CLAIM_POST_SUBMIT_REDIRECT_SESSION_KEY] = getEndOfJourneyCyaSubmitErrorPath(
        String(req.params?.caseReference ?? '')
      );
      return;
    }

    try {
      const { confirmationPath } = await submitRespondToClaimResponse(req);
      req.session[RESPOND_TO_CLAIM_POST_SUBMIT_REDIRECT_SESSION_KEY] = confirmationPath;
    } catch (error) {
      if (error instanceof RespondToClaimSubmitRejectedError) {
        req.session[RESPOND_TO_CLAIM_SUBMIT_REJECTION_SESSION_KEY] = submitRejectionReason(error.messages);
      }
      req.session[RESPOND_TO_CLAIM_POST_SUBMIT_REDIRECT_SESSION_KEY] = isDraftChangedError(error)
        ? getEndOfJourneyCyaDraftChangedPath(caseId)
        : getEndOfJourneyCyaSubmitErrorPath(caseId);
    }
  },
  resolveRedirectAfterPost: async (req: Request) => {
    const redirectPath = req.session[RESPOND_TO_CLAIM_POST_SUBMIT_REDIRECT_SESSION_KEY] as string | undefined;
    delete req.session[RESPOND_TO_CLAIM_POST_SUBMIT_REDIRECT_SESSION_KEY];
    return redirectPath;
  },
});
