import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'counter-claim-what-are-you-claiming-for',
  stepDir: __dirname,
  customTemplate: `${__dirname}/counterClaimWhatAreYouClaimingFor.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
  },
  fields: [
    {
      name: 'claimType',
      type: 'radio',
      required: true,
      isPageHeading: true,
      legendClasses: 'govuk-fieldset__legend--l',
      translationKey: {
        label: 'heading',
      },
      errorMessage: 'errors.claimType.required',
      options: [
        { value: 'PAYMENT_OR_COMPENSATION', translationKey: 'options.paymentOrCompensation' },
        { value: 'SOMETHING_ELSE', translationKey: 'options.somethingElse' },
        { value: 'BOTH', translationKey: 'options.both' },
      ],
    },
  ],
  getInitialFormData: req => {
    const claimType =
      req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.counterClaim?.claimType;

    if (!claimType) {
      return {};
    }

    return { claimType };
  },
  beforeRedirect: async req => {
    const claimType = req.body?.claimType as string | undefined;
    const response = buildDraftDefendantResponse(req);
    response.defendantResponses.counterClaim = response.defendantResponses.counterClaim ?? {};

    if (claimType) {
      response.defendantResponses.counterClaim.claimType = claimType;
      if (claimType === 'SOMETHING_ELSE') {
        delete response.defendantResponses.counterClaim.isClaimAmountKnown;
        delete response.defendantResponses.counterClaim.claimAmount;
        delete response.defendantResponses.counterClaim.estimatedMaxClaimAmount;
      }
    } else {
      delete response.defendantResponses.counterClaim.claimType;
      delete response.defendantResponses.counterClaim.isClaimAmountKnown;
      delete response.defendantResponses.counterClaim.claimAmount;
      delete response.defendantResponses.counterClaim.estimatedMaxClaimAmount;
    }

    await saveDraftDefendantResponse(req, response);
  },
});
