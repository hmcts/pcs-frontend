import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { PossessionClaimResponse, YesNoValue } from '@services/ccdCase.interface';
import { FeeType, getFee } from '@services/feeLookupService';

export const step: StepDefinition = createFormStep({
  stepName: 'counter-claim',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/counterClaim.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    question: 'question',
    whatCounterClaimIsHeading: 'whatCounterClaimIsHeading',
    whatCounterClaimIsParagraph1: 'whatCounterClaimIsParagraph1',
    whatCounterClaimIsBullet1: 'whatCounterClaimIsBullet1',
    whatCounterClaimIsBullet2: 'whatCounterClaimIsBullet2',
    whatCounterClaimIsParagraph2: 'whatCounterClaimIsParagraph2',
    whatCounterClaimIsParagraph3: 'whatCounterClaimIsParagraph3',
    whatCounterClaimIsLinkText: 'whatCounterClaimIsLinkText',
    whatCounterClaimIsLinkHref: 'whatCounterClaimIsLinkHref',
    whenMakeCounterClaimHeading: 'whenMakeCounterClaimHeading',
    whenMakeCounterClaimParagraph1: 'whenMakeCounterClaimParagraph1',
    whenMakeCounterClaimBullet1: 'whenMakeCounterClaimBullet1',
    whenMakeCounterClaimBullet2: 'whenMakeCounterClaimBullet2',
    whenMakeCounterClaimParagraph2: 'whenMakeCounterClaimParagraph2',
    whenMakeCounterClaimParagraph3: 'whenMakeCounterClaimParagraph3',
    counterClaimFeesHeading: 'counterClaimFeesHeading',
    counterClaimFeesParagraph1: 'counterClaimFeesParagraph1',
    counterClaimFeesParagraph2: 'counterClaimFeesParagraph2',
    counterClaimFeesCourtFeesLinkText: 'counterClaimFeesCourtFeesLinkText',
  },
  fields: [
    {
      name: 'makeCounterClaim',
      type: 'radio',
      required: true,
      legendClasses: 'govuk-fieldset__legend--m',
      translationKey: {
        label: 'question',
      },
      errorMessage: 'errors.makeCounterClaim',
      options: [
        { value: 'YES', translationKey: 'options.yes' },
        { value: 'NO', translationKey: 'options.no' },
      ],
    },
  ],
  beforeRedirect: async req => {
    const makeCounterClaim: YesNoValue = req.body?.makeCounterClaim;
    if (!makeCounterClaim) {
      return;
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        makeCounterClaim,
      },
    };

    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
  getInitialFormData: req => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const makeCounterClaim: YesNoValue | undefined =
      caseData?.possessionClaimResponse?.defendantResponses?.makeCounterClaim;

    return makeCounterClaim !== undefined ? { makeCounterClaim } : {};
  },
  extendGetContent: async () => {
    const counterClaimFlatFeeFEE0450 = await getFee(FeeType.counterClaimFlatFeeFEE0450);
    return { counterClaimFlatFeeFEE0450 };
  },
});
