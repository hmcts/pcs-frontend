import { Request } from 'express';

import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import { StepDefinition } from '@modules/steps/stepFormData.interface';
import { FeeType, getFee } from '@services/feeLookupService';

export const step: StepDefinition = createFormStep({
  stepName: 'ask-the-court-to-set-aside-the-order',
  journeyFolder: 'makeAnApplication',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/askTheCourtToSetAsideTheOrder.njk`,
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
    whatYouWantTheCourtToDo: 'whatYouWantTheCourtToDo',
    whyYouAreAskingTheCourt: 'whyYouAreAskingTheCourt',
    youMayNeedToProvideEvidence: 'youMayNeedToProvideEvidence',
    beforeYouStart: 'beforeYouStart',
    makeSureThatYouHaveAllOfTheEvidence: 'makeSureThatYouHaveAllOfTheEvidence',
    onceYouStart: 'onceYouStart',
    weWillNotSaveYourAnswers: 'weWillNotSaveYourAnswers',
    howMuchItWillCost: 'howMuchItWillCost',
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
