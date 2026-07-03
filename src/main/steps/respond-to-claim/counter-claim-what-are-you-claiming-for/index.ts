import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CcdCounterClaim } from '@services/ccdCase.interface';

function clearCounterClaimMoneyFields(counterClaim: CcdCounterClaim): void {
  delete counterClaim.isClaimAmountKnown;
  delete counterClaim.claimAmount;
  delete counterClaim.estimatedMaxClaimAmount;
}

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'counter-claim-what-are-you-claiming-for',
  isAnswered: req => Boolean(req.res?.locals.validatedCase?.defendantResponses?.counterClaim?.claimType),
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
      req.res?.locals.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.counterClaim?.claimType;

    if (!claimType) {
      return {};
    }

    return { claimType };
  },
  beforeRedirect: async req => {
    const claimType = req.body?.claimType as string | undefined;
    const previousClaimType =
      req.res?.locals.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.counterClaim?.claimType;
    const response = buildDraftDefendantResponse(req);
    response.defendantResponses.counterClaim = response.defendantResponses.counterClaim ?? {};

    if (claimType) {
      response.defendantResponses.counterClaim.claimType = claimType;
      if (claimType !== previousClaimType) {
        clearCounterClaimMoneyFields(response.defendantResponses.counterClaim);
      }
    } else {
      delete response.defendantResponses.counterClaim.claimType;
      clearCounterClaimMoneyFields(response.defendantResponses.counterClaim);
    }

    await saveDraftDefendantResponse(req, response);
  },
});
