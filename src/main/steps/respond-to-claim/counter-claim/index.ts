import type { Request } from 'express';

import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { YesNoValue } from '@services/ccdCase.interface';
import { FeeType, getFee } from '@services/feeLookupService';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'counter-claim',
  stepDir: __dirname,
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
    const makeCounterClaim = req.body?.makeCounterClaim as YesNoValue | undefined;
    const response = buildDraftDefendantResponse(req);

    if (makeCounterClaim) {
      response.defendantResponses.makeCounterClaim = makeCounterClaim;
    } else {
      delete response.defendantResponses.makeCounterClaim;
    }

    await saveDraftDefendantResponse(req, response);
  },
  getInitialFormData: (req: Request) => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const makeCounterClaim: YesNoValue | undefined =
      caseData?.possessionClaimResponse?.defendantResponses?.makeCounterClaim;

    return makeCounterClaim !== undefined ? { makeCounterClaim } : {};
  },
  extendGetContent: async (req: Request) => {
    const counterClaimFlatFeeFEE0450 = await getFee(FeeType.counterClaimFlatFeeFEE0450);
    const caseData = req.res?.locals?.validatedCase?.data;
    const claimantName = (caseData?.possessionClaimResponse?.claimantOrganisations?.[0]?.value as string) ?? '';
    return { counterClaimFlatFeeFEE0450, claimantName };
  },
});
