import { Request } from 'express';

import { FeeType } from '../../../interfaces/feeService.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

import { getFee } from '@services/feeLookupService';

export const step: StepDefinition = createFormStep({
  stepName: 'ask-the-court-to-make-an-order',
  journeyFolder: 'makeAnApplication',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/askTheCourtToMakeAnOrder.njk`,
  fields: [],
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    heading: 'heading',
    paragraph1: 'paragraph1',
    examplesIntro: 'examplesIntro',
    example1: 'example1',
    example2: 'example2',
    example3: 'example3',
    example4: 'example4',
    forExampleYouCanUseThisTo: 'forExampleYouCanUseThisTo',
    addAnExtraParty: 'addAnExtraParty',
    reliefFromSanctions: 'reliefFromSanctions',
    serveAClaimOutsideEnglandAndWales: 'serveAClaimOutsideEnglandAndWales',
    transferForEnforcement: 'transferForEnforcement',
    cannotSuspendOnlineIntro: 'cannotSuspendOnlineIntro',
    toApplyByPost: 'toApplyByPost',
    readGuidance: 'readGuidance',
    fillInFormForSuspend: 'fillInFormForSuspend',
    whatYouWillNeedToApply: 'whatYouWillNeedToApply',
    youWillNeedToKnow: 'youWillNeedToKnow',
    ifYouCanPayTheCourtFee: 'ifYouCanPayTheCourtFee',
    whatYouWantTheCourtToDo: 'whatYouWantTheCourtToDo',
    whyYouAreAskingTheCourt: 'whyYouAreAskingTheCourt',
    youMayNeedToProvideEvidence: 'youMayNeedToProvideEvidence',
    beforeYouStart: 'beforeYouStart',
    makeSureThatYouHaveAllOfTheEvidence: 'makeSureThatYouHaveAllOfTheEvidence',
    onceYouStart: 'onceYouStart',
    weWillNotSaveYourAnswers: 'weWillNotSaveYourAnswers',
    howMuchWillItCost: 'howMuchWillItCost',
    usualCosts: 'usualCosts',
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
