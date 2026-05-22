import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { createRespondToClaimFormStep } from '../formStep';
import { sectionIdToBackendEnum } from '../sections.config';

import { buildEndOfJourneyCyaSections } from './buildEndOfJourneyCyaRows';

import { getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

const STEP_NAME = 'end-of-journey-cya';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: STEP_NAME,
  stepDir: __dirname,
  customTemplate: `${__dirname}/endOfJourneyCya.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    statementOfTruthHeading: 'statementOfTruth.heading',
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
      type: 'character-count',
      required: true,
      maxLength: 120,
      labelClasses: 'govuk-label--s',
      errorMessage: 'errors.fullName',
      translationKey: { label: 'statementOfTruth.fullNameLabel' },
    },
  ],
  getInitialFormData: (req: Request) => {
    const responses = req.res?.locals.validatedCase?.possessionClaimResponse?.defendantResponses;
    const accepted = responses?.statementOfTruthAccepted === 'YES';
    const fullName = responses?.statementOfTruthFullName;
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
    ]);
    const t: TFunction = getTranslationFunction(req, ['common']);
    const sections = buildEndOfJourneyCyaSections(req, t);
    return { sections };
  },
  beforeRedirect: async (req: Request) => {
    const draft = buildDraftDefendantResponse(req);

    const contempt = req.body?.statementOfTruthContempt as string[] | undefined;
    const belief = req.body?.statementOfTruthBelief as string[] | undefined;
    const bothAccepted = contempt?.includes('yes') && belief?.includes('yes');
    draft.defendantResponses.statementOfTruthAccepted = bothAccepted ? 'YES' : 'NO';
    draft.defendantResponses.statementOfTruthFullName = (req.body?.fullName as string | undefined)?.trim();

    const enumValue = sectionIdToBackendEnum('checkYourAnswersAndSubmit');
    const current = draft.defendantResponses.completedSections ?? [];
    if (!current.includes(enumValue)) {
      draft.defendantResponses.completedSections = [...current, enumValue];
    }
    await saveDraftDefendantResponse(req, draft);
  },
});
