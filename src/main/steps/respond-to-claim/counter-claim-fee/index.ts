import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { YesNoValue } from '@services/ccdCase.interface';
import { getCounterClaimFeeType, getFee } from '@services/feeLookupService';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'counter-claim-fee',
  isAnswered: req => Boolean(req.res?.locals.validatedCase?.defendantResponses?.counterClaim?.needHelpWithFees),
  stepDir: __dirname,
  customTemplate: `${__dirname}/counterClaimFee.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    counterClaimFeeCostParagraph: 'counterClaimFeeCostParagraph',
    counterClaimFeeHeading: 'counterClaimFeeHeading',
    counterClaimFeeHelpParagraph: 'counterClaimFeeHelpParagraph',
    counterClaimFeeBulletBenefits: 'counterClaimFeeBulletBenefits',
    counterClaimFeeBulletLowSavings: 'counterClaimFeeBulletLowSavings',
    counterClaimFeeBulletLowIncome: 'counterClaimFeeBulletLowIncome',
  },
  fields: [
    {
      name: 'counterClaimNeedHelpWithFees',
      type: 'radio',
      required: true,
      legendClasses: 'govuk-fieldset__legend--m',
      translationKey: {
        label: 'counterClaimFeeHeading2',
      },
      errorMessage: 'errors.counterClaimFee.required',
      options: [
        { value: 'YES', translationKey: 'counterClaimFeeOptions.iNeedHelpWithPayingFee' },
        { value: 'NO', translationKey: 'counterClaimFeeOptions.iDoNotNeedHelpWithPayingFee' },
      ],
    },
  ],
  getInitialFormData: req => {
    const caseData = req.res?.locals.validatedCase?.data;
    const counterClaimNeedHelpWithFees: YesNoValue | undefined =
      caseData?.possessionClaimResponse?.defendantResponses?.counterClaim?.needHelpWithFees;

    return counterClaimNeedHelpWithFees ? { counterClaimNeedHelpWithFees } : {};
  },
  beforeRedirect: async req => {
    const selection = req.body?.counterClaimNeedHelpWithFees as YesNoValue | undefined;
    const response = buildDraftDefendantResponse(req);
    response.defendantResponses.counterClaim = response.defendantResponses.counterClaim ?? {};

    if (selection === 'YES' || selection === 'NO') {
      response.defendantResponses.counterClaim.needHelpWithFees = selection;
    } else {
      delete response.defendantResponses.counterClaim.needHelpWithFees;
    }
    // Downstream cleanup (appliedForHwf, hwfReferenceNumber, counterClaimAgainst/For/Reasons)
    // is the normaliser's job — see normaliseCounterClaim.
    await saveDraftDefendantResponse(req, response);
  },
  extendGetContent: async req => {
    const counterClaim = req.res?.locals.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.counterClaim;
    const claimAmountInPence =
      counterClaim?.isClaimAmountKnown === 'YES'
        ? counterClaim?.claimAmount
        : counterClaim?.isClaimAmountKnown === 'NO'
          ? counterClaim?.estimatedMaxClaimAmount
          : undefined;

    if (!counterClaim?.claimType) {
      throw new Error('Counterclaim fee unavailable: missing claimType');
    }

    const feeType = getCounterClaimFeeType(counterClaim.claimType, claimAmountInPence);
    const counterClaimFee = await getFee(feeType, claimAmountInPence);
    return { counterClaimFee };
  },
});
