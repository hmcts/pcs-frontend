import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CaseData, LanguageUsed } from '@services/ccdCase.interface';
import { redirectToPcq } from '@services/pcq/redirectToPcq';

const isLanguageUsedEnabled = (req: Request): boolean => req.res?.locals.welshEnabled === true;

// The step is hidden by its show condition when cui-welsh-enabled is off. Legal reps skip
// the access guard that enforces that, so a direct visit is sent on to the end-of-journey CYA.
export const languageUsedEnabledMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const caseId = req.res?.locals.validatedCase?.id;
  if (isLanguageUsedEnabled(req) || !caseId) {
    return next();
  }
  res.redirect(303, `/case/${caseId}/respond-to-claim/end-of-journey-cya?nav=1`);
};

// Offer PCQ (the equality questionnaire) before the language screen renders.
// redirectToPcq 303s to PCQ (which returns the citizen to language-used?nav=1);
// on the return leg the reserved PcqId makes it a no-op.
export const pcqEntryMiddleware: RequestHandler = async (req: Request, _res: Response, next: NextFunction) => {
  const redirected = await redirectToPcq(req);
  if (!redirected) {
    next();
  }
};

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'language-used',
  isAnswered: req => Boolean(req.res?.locals.validatedCase?.defendantResponses?.languageUsed),
  stepDir: __dirname,
  customTemplate: `${__dirname}/languageUsed.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    caption: 'caption',
    languageHeading: 'languageHeading',
    question: 'question',
  },
  fields: [
    {
      name: 'languageUsed',
      type: 'radio',
      required: true,
      legendClasses: 'govuk-visually-hidden',
      translationKey: {
        label: 'heading',
      },
      errorMessage: 'errors.languageUsed',
      options: [
        { value: 'ENGLISH', translationKey: 'language.english' },
        { value: 'WELSH', translationKey: 'language.welsh' },
        { value: 'ENGLISH_AND_WELSH', translationKey: 'language.englishAndWelsh' },
      ],
    },
  ],
  getInitialFormData: req => {
    const caseData: CaseData | undefined = req.res?.locals.validatedCase?.data;
    const languageUsedCcd: LanguageUsed | undefined =
      caseData?.possessionClaimResponse?.defendantResponses?.languageUsed;

    return languageUsedCcd ? { languageUsed: languageUsedCcd } : {};
  },
  beforeRedirect: async req => {
    const languageUsed: LanguageUsed | undefined = req.body?.languageUsed;
    const response = buildDraftDefendantResponse(req);

    if (languageUsed && isLanguageUsedEnabled(req)) {
      response.defendantResponses = { ...response.defendantResponses, languageUsed };
    }

    await saveDraftDefendantResponse(req, response);
  },
});

// createRespondToClaimFormStep does not carry a middleware field through, so attach the PCQ entry
// hook to the built step. registerSteps applies step.middleware to the GET route (after the case
// loads), so it runs before the language screen is rendered.
step.middleware = [languageUsedEnabledMiddleware, pcqEntryMiddleware];
