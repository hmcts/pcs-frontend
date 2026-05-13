import type { Request } from 'express';

import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'counter-claim-about',
  stepDir: __dirname,
  customTemplate: `${__dirname}/counterClaimAbout.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    infoParagraph1: 'infoParagraph1',
    infoParagraph2: 'infoParagraph2',
  },
  fields: [
    {
      name: 'counterClaimFor',
      type: 'character-count',
      required: true,
      maxLength: 6800,
      errorMessage: 'errors.counterClaimForRequired',
      labelClasses: 'govuk-label--m',
      translationKey: {
        label: 'counterClaimForLabel',
      },
    },
    {
      name: 'counterClaimReasons',
      type: 'character-count',
      required: true,
      maxLength: 6800,
      errorMessage: 'errors.counterClaimReasonsRequired',
      labelClasses: 'govuk-label--m',
      translationKey: {
        label: 'counterClaimReasonsLabel',
      },
    },
  ],
  getInitialFormData: (req: Request) => {
    const counterClaim =
      req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.counterClaim;
    if (!counterClaim) {
      return {};
    }
    return {
      ...(counterClaim.counterClaimFor ? { counterClaimFor: counterClaim.counterClaimFor } : {}),
      ...(counterClaim.counterClaimReasons ? { counterClaimReasons: counterClaim.counterClaimReasons } : {}),
    };
  },
  beforeRedirect: async (req: Request) => {
    const counterClaimFor = (req.body?.counterClaimFor as string | undefined)?.trim();
    const counterClaimReasons = (req.body?.counterClaimReasons as string | undefined)?.trim();

    const response = buildDraftDefendantResponse(req);
    response.defendantResponses.counterClaim = response.defendantResponses.counterClaim ?? {};

    if (counterClaimFor) {
      response.defendantResponses.counterClaim.counterClaimFor = counterClaimFor;
    } else {
      delete response.defendantResponses.counterClaim.counterClaimFor;
    }

    if (counterClaimReasons) {
      response.defendantResponses.counterClaim.counterClaimReasons = counterClaimReasons;
    } else {
      delete response.defendantResponses.counterClaim.counterClaimReasons;
    }

    await saveDraftDefendantResponse(req, response);
  },
});
