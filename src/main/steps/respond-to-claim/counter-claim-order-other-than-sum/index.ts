import type { Request } from 'express';

import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'counter-claim-order-other-than-sum',
  stepDir: __dirname,
  customTemplate: `${__dirname}/counterClaimOrderOtherThanSum.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    infoParagraph1: 'infoParagraph1',
    infoParagraph2: 'infoParagraph2',
  },
  fields: [
    {
      name: 'otherOrderRequestDetails',
      type: 'character-count',
      required: true,
      maxLength: 6800,
      errorMessage: 'errors.otherOrderRequestDetailsRequired',
      labelClasses: 'govuk-label--s',
      translationKey: {
        label: 'otherOrderRequestDetailsLabel',
        hint: 'characterCountHint',
      },
    },
    {
      name: 'otherOrderRequestFacts',
      type: 'character-count',
      required: true,
      maxLength: 6800,
      errorMessage: 'errors.otherOrderRequestFactsRequired',
      labelClasses: 'govuk-label--s',
      translationKey: {
        label: 'otherOrderRequestFactsLabel',
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
      ...(counterClaim.otherOrderRequestDetails
        ? { otherOrderRequestDetails: counterClaim.otherOrderRequestDetails }
        : {}),
      ...(counterClaim.otherOrderRequestFacts ? { otherOrderRequestFacts: counterClaim.otherOrderRequestFacts } : {}),
    };
  },
  beforeRedirect: async (req: Request) => {
    const otherOrderRequestDetails = (req.body?.otherOrderRequestDetails as string | undefined)?.trim();
    const otherOrderRequestFacts = (req.body?.otherOrderRequestFacts as string | undefined)?.trim();

    const response = buildDraftDefendantResponse(req);
    response.defendantResponses.counterClaim = response.defendantResponses.counterClaim ?? {};

    if (otherOrderRequestDetails) {
      response.defendantResponses.counterClaim.otherOrderRequestDetails = otherOrderRequestDetails;
    } else {
      delete response.defendantResponses.counterClaim.otherOrderRequestDetails;
    }

    if (otherOrderRequestFacts) {
      response.defendantResponses.counterClaim.otherOrderRequestFacts = otherOrderRequestFacts;
    } else {
      delete response.defendantResponses.counterClaim.otherOrderRequestFacts;
    }

    await saveDraftDefendantResponse(req, response);
  },
});
