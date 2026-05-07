import type { Request } from 'express';

import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CcdCounterClaim, PossessionClaimResponse } from '@services/ccdCase.interface';

export const step: StepDefinition = createFormStep({
  stepName: 'counter-claim-order-other-than-sum',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
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

    const counterClaim: CcdCounterClaim = {
      ...(otherOrderRequestDetails ? { otherOrderRequestDetails } : {}),
      ...(otherOrderRequestFacts ? { otherOrderRequestFacts } : {}),
    };
    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: { counterClaim: { ...counterClaim } },
    };
    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
});
