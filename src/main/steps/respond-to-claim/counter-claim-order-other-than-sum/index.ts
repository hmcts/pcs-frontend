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
      name: 'orderOtherThanSumRequested',
      type: 'character-count',
      required: true,
      maxLength: 6800,
      errorMessage: 'errors.orderOtherThanSumRequested.required',
      labelClasses: 'govuk-label--s',
      translationKey: {
        label: 'orderOtherThanSumRequestedLabel',
        hint: 'characterCountHint',
      },
    },
    {
      name: 'orderOtherThanSumFacts',
      type: 'character-count',
      required: true,
      maxLength: 6800,
      errorMessage: 'errors.orderOtherThanSumFacts.required',
      labelClasses: 'govuk-label--s',
      translationKey: {
        label: 'orderOtherThanSumFactsLabel',
      },
    },
  ],
  getInitialFormData: (req: Request) => {
    const counterClaim =
      req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.counterClaim;
    if (!counterClaim) {return {};}
    return {
      ...(counterClaim.orderOtherThanSumRequested
        ? { orderOtherThanSumRequested: counterClaim.orderOtherThanSumRequested }
        : {}),
      ...(counterClaim.orderOtherThanSumFacts ? { orderOtherThanSumFacts: counterClaim.orderOtherThanSumFacts } : {}),
    };
  },
  beforeRedirect: async (req: Request) => {
    const orderOtherThanSumRequested = (req.body?.orderOtherThanSumRequested as string | undefined)?.trim();
    const orderOtherThanSumFacts = (req.body?.orderOtherThanSumFacts as string | undefined)?.trim();

    if (!orderOtherThanSumRequested && !orderOtherThanSumFacts) {return;}

    const counterClaim: CcdCounterClaim = {
      ...(orderOtherThanSumRequested ? { orderOtherThanSumRequested } : {}),
      ...(orderOtherThanSumFacts ? { orderOtherThanSumFacts } : {}),
    };
    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: { counterClaim: { ...counterClaim } },
    };
    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
});
