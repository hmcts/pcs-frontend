import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CcdCounterClaim, PossessionClaimResponse, VerticalYesNoValue } from '@services/ccdCase.interface';
import { DIRECT_LOOKUP_FEE_CODES, getCounterClaimFeeType, getFee, getFeeDirect } from '@services/feeLookupService';


export const step: StepDefinition = createFormStep({
  stepName: 'counter-claim-fee',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
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
      isPageHeading: true,
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
    const caseData = req.res?.locals?.validatedCase?.data;
    const counterClaimNeedHelpWithFees: VerticalYesNoValue | undefined =
      caseData?.possessionClaimResponse?.defendantResponses?.counterClaim?.needHelpWithFees;

    return counterClaimNeedHelpWithFees ? { counterClaimNeedHelpWithFees } : {};
  },
  beforeRedirect: async req => {
    const counterClaimNeedHelpWithFees: VerticalYesNoValue = req.body?.counterClaimNeedHelpWithFees;

    if (!counterClaimNeedHelpWithFees) {
      return;
    }

    const counterClaim: CcdCounterClaim = { needHelpWithFees: counterClaimNeedHelpWithFees };
    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: { counterClaim: { ...counterClaim } },
    };
    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
  extendGetContent: async req => {
    const counterClaim =
      req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.counterClaim;
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
    const directCode = DIRECT_LOOKUP_FEE_CODES[feeType];
    const counterClaimFee = directCode ? await getFeeDirect(directCode, claimAmountInPence) : await getFee(feeType);
    return { counterClaimFee };
  },
});
