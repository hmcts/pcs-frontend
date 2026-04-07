import { Request } from 'express';

import { FeeType } from '../../../interfaces/feeService.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

import { getFee } from '@services/feeLookupService';

export const step: StepDefinition = createFormStep({
  stepName: 'ask-to-adjourn-the-court-hearing',
  journeyFolder: 'makeAnApplication',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/askToAdjournTheCourtHearing.njk`,
  fields: [],
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    heading: 'heading',
    paragraph1: 'paragraph1',
    paragraph2: 'paragraph2',
    whatYouWillNeedToApply: 'whatYouWillNeedToApply',
    youWillNeedToKnow: 'youWillNeedToKnow',
    ifYouCanPayTheCourtFee: 'ifYouCanPayTheCourtFee',
    whyYouAreAskingTheCourt: 'whyYouAreAskingTheCourt',
    whenProposingMovingTo: 'whenProposingMovingTo',
    youMayNeedToProvideEvidence: 'youMayNeedToProvideEvidence',
    beforeYouStart: 'beforeYouStart',
    onceYouStart: 'onceYouStart',
    weWillNotSaveYourAnswers: 'weWillNotSaveYourAnswers',
    howLongItTakes: 'howLongItTakes',
    assessedOnUrgencyBasis: 'assessedOnUrgencyBasis',
    howMuchItWillCost: 'howMuchItWillCost',
    freeIfAtLeast14DaysAway: 'freeIfAtLeast14DaysAway',
    ifHearingSoonerNeedToPay: 'ifHearingSoonerNeedToPay',
    feeIncreasesIf: 'feeIncreasesIf',
    youHaveAlreadyToldTheOtherParty: 'youHaveAlreadyToldTheOtherParty',
    theyDidNotAgreeToIt: 'theyDidNotAgreeToIt',
    youWillSeeTheFinalApplicationFee: 'youWillSeeTheFinalApplicationFee',
    ifYouAreWorriedAboutPayingFees: 'ifYouAreWorriedAboutPayingFees',
    youMayBeEligibleForHWF: 'youMayBeEligibleForHWF',
    applyByPost: 'applyByPost',
    ifPreferToRespondByPost: 'ifPreferToRespondByPost',
    fillInFormForPost: 'fillInFormForPost',
    findYourLocalCourt: 'findYourLocalCourt',
    sendTheCompletedFormToTheCourt: 'sendTheCompletedFormToTheCourt',
  },
  extendGetContent: async (_req: Request) => {
    const standardFeePromise = getFee(FeeType.genAppStandardFee);
    const maxFeePromise = getFee(FeeType.genAppMaxFee);
    const [standardFee, maxFee] = await Promise.all([standardFeePromise, maxFeePromise]);
    return {
      standardFee,
      maxFee,
    };
  },
});
