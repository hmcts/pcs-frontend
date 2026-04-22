import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CcdCounterClaim, PossessionClaimResponse } from '@services/ccdCase.interface';

export const step: StepDefinition = createFormStep({
  stepName: 'counterclaim-what-are-you-claiming-for',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/counterclaimWhatAreYouClaimingFor.njk`,
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

    if (!claimType) {
      return;
    }

    const counterClaim: CcdCounterClaim = { claimType };
    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: { counterClaim: { ...counterClaim } },
    };
    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
});
