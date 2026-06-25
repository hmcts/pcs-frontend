import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
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
      // Change from true to a functional condition:
      required: formData => formData?.isLegalRepresentative !== 'true',
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
      attributes: { maxlength: '100' },
      errorMessage: 'errors.fullName',
      translationKey: { label: 'statementOfTruth.fullNameLabel' },
    },
    {
      name: 'nameOfFirm',
      type: 'text',
      required: formData => formData?.isLegalRepresentative === 'true',
      attributes: { maxlength: '100' },
      errorMessage: 'errors.nameOfFirm',
      translationKey: { label: 'statementOfTruth.nameOfFirmLabel' },
    },
    {
      name: 'positionHeld',
      type: 'text',
      required: formData => formData?.isLegalRepresentative === 'true',
      attributes: { maxlength: '100' },
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
  extendGetContent: async (req: Request, formContent) => {
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

    // For legal reps: mutate the pre-built field components to use legal-rep specific text
    if (isLegalRepresentative && formContent?.fields?.length) {
      const tSot = getTranslationFunction(req);
      const beliefField = formContent.fields.find(f => f.name === 'statementOfTruthBelief');
      if (beliefField?.component) {
        const component = beliefField.component as Record<string, unknown>;
        const items = component.items as Record<string, unknown>[] | undefined;
        if (items?.[0]) {
          items[0].text = tSot('statementOfTruth.legalRepBeliefOption');
        }
        // Override the error message for belief field
        if (component.errorMessage) {
          (component.errorMessage as Record<string, unknown>).text = tSot('errors.legalRepStatementOfTruthBelief');
        }
      }

      const fullNameField = formContent.fields.find(f => f.name === 'fullName');
      if (fullNameField?.component) {
        const component = fullNameField.component as Record<string, unknown>;
        const label = component.label as Record<string, unknown> | undefined;
        if (label) {
          label.text = tSot('statementOfTruth.legalRepFullNameLabel');
        }
      }
    }

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

    const contempt = req.body?.statementOfTruthContempt as string[] | undefined;
    const belief = req.body?.statementOfTruthBelief as string[] | undefined;
    const isLegalRepresentative = req.res?.locals.isLegalRepresentative === true;

    // Fix: Condition bothAccepted based on whether they are a Legal Rep
    const bothAccepted = isLegalRepresentative
      ? belief?.includes('yes')
      : contempt?.includes('yes') && belief?.includes('yes');

    // For legal reps, also persist nameOfFirm and positionHeld
    draft.defendantResponses.statementOfTruth = {
      accepted: bothAccepted ? 'YES' : 'NO',
      fullName: (req.body?.fullName as string | undefined)?.trim(),
      ...(isLegalRepresentative
        ? {
            nameOfFirm: (req.body?.nameOfFirm as string | undefined)?.trim(),
            positionHeld: (req.body?.positionHeld as string | undefined)?.trim(),
          }
        : {}),
    };

    const enumValue = sectionIdToBackendEnum('checkYourAnswersAndSubmit');
    const current = draft.defendantResponses.completedSections ?? [];
    if (!current.includes(enumValue)) {
      draft.defendantResponses.completedSections = [...current, enumValue];
    }
    await saveDraftDefendantResponse(req, draft);
  },
});
