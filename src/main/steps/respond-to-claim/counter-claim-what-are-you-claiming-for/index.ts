import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createFormStep({
  stepName: 'counter-claim-what-are-you-claiming-for',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
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
    } else {
      delete response.defendantResponses.counterClaim.claimType;
    }

    await saveDraftDefendantResponse(req, response);
  },
});
