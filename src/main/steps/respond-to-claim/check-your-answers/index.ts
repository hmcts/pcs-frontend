import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { createRespondToClaimFormStep } from '../formStep';
import { sectionIdToBackendEnum } from '../sections.config';

import { buildEndOfJourneyCyaSections } from './buildEndOfJourneyCyaRows';

import { getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

const STEP_NAME = 'check-your-answers';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: STEP_NAME,
  stepDir: __dirname,
  customTemplate: `${__dirname}/checkYourAnswers.njk`,
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
  extendGetContent: async (req: Request) => {
    const t: TFunction = getTranslationFunction(req, STEP_NAME, ['common']);
    const sections = buildEndOfJourneyCyaSections(req, t);
    return { sections };
  },
  beforeRedirect: async (req: Request) => {
    const draft = buildDraftDefendantResponse(req);
    const enumValue = sectionIdToBackendEnum('checkYourAnswersAndSubmit');
    const current = draft.defendantResponses.confirmedSections ?? [];
    if (!current.includes(enumValue)) {
      draft.defendantResponses.confirmedSections = [...current, enumValue];
    }
    await saveDraftDefendantResponse(req, draft);
  },
});
