import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { createRespondToClaimFormStep } from '../formStep';
import { sectionIdToBackendEnum } from '../sections.config';

import { buildEndOfJourneyCyaSections } from './buildEndOfJourneyCyaRows';

import { getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { buildErrorSummary } from '@modules/steps/formBuilder/errorUtils';
import { FormFieldConfig } from '@modules/steps/formBuilder/formFieldConfig.interface';

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
      required: true,
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
  ],
  getInitialFormData: (req: Request) => {
    const sot = req.res?.locals.validatedCase?.possessionClaimResponse?.defendantResponses?.statementOfTruth;
    const accepted = sot?.accepted === 'YES';
    const fullName = sot?.fullName;
    return {
      ...(accepted ? { statementOfTruthContempt: ['yes'], statementOfTruthBelief: ['yes'] } : {}),
      ...(fullName ? { fullName } : {}),
    };
  },
  extendGetContent: async (req: Request) => {
    await req.i18n?.loadNamespaces([
      'respondToClaim/checkYourAnswersStartNowAndDetails',
      'respondToClaim/checkYourAnswersPersonalDetails',
      'respondToClaim/checkYourAnswersYourResponse',
      'respondToClaim/checkYourAnswersPaymentsAndAgreements',
      'respondToClaim/checkYourAnswersYourCircumstances',
      'respondToClaim/checkYourAnswersIncomeAndExpenses',
      'respondToClaim/checkYourAnswersDocuments',
      'respondToClaim/checkYourAnswers',
    ]);
    const t: TFunction = getTranslationFunction(req, ['common']);
    const sections = buildEndOfJourneyCyaSections(req, t);
    const status = req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.status;
    const submitDisabled = status === 'SUBMITTED';

    if (req.query.submitError !== 'failed') {
      return { sections, submitDisabled };
    }

    const tError = getTranslationFunction(req, ['respondToClaim/checkYourAnswers', 'common']);
    const translated = tError('errors.submitResponseFailed');
    const message =
      translated && translated !== 'errors.submitResponseFailed'
        ? translated
        : 'Failed to submit response. Please try again.';

    const errorSummary = buildErrorSummary({ submitResponse: message }, submitResponseErrorFields, tError);

    return { sections, submitDisabled, ...(errorSummary ? { errorSummary } : {}) };
  },
  beforeRedirect: async (req: Request) => {
    const draft = buildDraftDefendantResponse(req);

    const contempt = req.body?.statementOfTruthContempt as string[] | undefined;
    const belief = req.body?.statementOfTruthBelief as string[] | undefined;
    const bothAccepted = contempt?.includes('yes') && belief?.includes('yes');
    draft.defendantResponses.statementOfTruth = {
      accepted: bothAccepted ? 'YES' : 'NO',
      fullName: (req.body?.fullName as string | undefined)?.trim(),
    };

    const enumValue = sectionIdToBackendEnum('checkYourAnswersAndSubmit');
    const current = draft.defendantResponses.completedSections ?? [];
    if (!current.includes(enumValue)) {
      draft.defendantResponses.completedSections = [...current, enumValue];
    }
    await saveDraftDefendantResponse(req, draft);
  },
});
