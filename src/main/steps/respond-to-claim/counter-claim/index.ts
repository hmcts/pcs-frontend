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
    whatCounterclaimIsHeading: 'whatCounterclaimIsHeading',
    whatCounterclaimIsParagraph1: 'whatCounterclaimIsParagraph1',
    whatCounterclaimIsBullet1: 'whatCounterclaimIsBullet1',
    whatCounterclaimIsBullet2: 'whatCounterclaimIsBullet2',
    whatCounterclaimIsParagraph2: 'whatCounterclaimIsParagraph2',
    whatCounterclaimIsParagraph3: 'whatCounterclaimIsParagraph3',
    whatCounterclaimIsLinkText: 'whatCounterclaimIsLinkText',
    whatCounterclaimIsLinkHref: 'whatCounterclaimIsLinkHref',
    whenMakeCounterclaimHeading: 'whenMakeCounterclaimHeading',
    whenMakeCounterclaimParagraph1: 'whenMakeCounterclaimParagraph1',
    whenMakeCounterclaimBullet1: 'whenMakeCounterclaimBullet1',
    whenMakeCounterclaimBullet2: 'whenMakeCounterclaimBullet2',
    whenMakeCounterclaimParagraph2: 'whenMakeCounterclaimParagraph2',
    whenMakeCounterclaimParagraph3: 'whenMakeCounterclaimParagraph3',
    counterclaimFeesHeading: 'counterclaimFeesHeading',
    counterclaimFeesParagraph1: 'counterclaimFeesParagraph1',
    counterclaimFeesParagraph2: 'counterclaimFeesParagraph2',
    counterclaimFeesCourtFeesLinkText: 'counterclaimFeesCourtFeesLinkText',
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
    const sessionUserId = req.session?.user?.uid;
    const userId = typeof sessionUserId === 'string' ? sessionUserId : undefined;

    if (!makeCounterClaim) {
      return;
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        makeCounterClaim,
        ...(makeCounterClaim === 'YES' && userId
          ? {
              counterClaim: {
                createdBy: userId,
                claimSubmittedDate: new Date().toISOString().slice(0, 10),
              },
            }
          : {}),
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
