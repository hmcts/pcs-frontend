import type { Request } from 'express';

import { createFormStep, getStepUrl } from '../../../modules/steps';
import { flowConfig } from '../flow.config';
import { getSuspendApplicationFee } from '../suspendFee';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { getLaunchDarklyFlag } from '@utils/getLaunchDarklyFlag';
import { RELEASE_1B_ENABLED } from '@utils/respondToClaimFlags';

export const step: StepDefinition = createFormStep({
  stepName: 'apply-to-stop-or-delay-the-eviction',
  journeyFolder: 'makeAnApplication',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/applyToStopOrDelayTheEviction.njk`,
  fields: [],
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    heading: 'heading',
    paragraph1: 'paragraph1',
    paragraph2: 'paragraph2',
    ifCourtApprovesHeading: 'ifCourtApprovesHeading',
    ifCourtApprovesParagraph1: 'ifCourtApprovesParagraph1',
    ifCourtApprovesParagraph2: 'ifCourtApprovesParagraph2',
    ifCourtRefusesHeading: 'ifCourtRefusesHeading',
    ifCourtRefusesParagraph: 'ifCourtRefusesParagraph',
    whatYouWillNeedToApply: 'whatYouWillNeedToApply',
    youWillNeedToKnow: 'youWillNeedToKnow',
    ifYouCanPayTheCourtFee: 'ifYouCanPayTheCourtFee',
    whyYouAreAskingTheCourt: 'whyYouAreAskingTheCourt',
    youWillAlsoNeedEvidence: 'youWillAlsoNeedEvidence',
    howLongItTakes: 'howLongItTakes',
    reviewTime: 'reviewTime',
    howMuchItWillCost: 'howMuchItWillCost',
    suspendCost: 'suspendCost',
    moreThanOneThing: 'moreThanOneThing',
    ifYouAreWorriedAboutPayingFees: 'ifYouAreWorriedAboutPayingFees',
    helpWithFees: 'helpWithFees',
    applyByPost: 'applyByPost',
    ifPreferToRespondByPost: 'ifPreferToRespondByPost',
    fillInFormForPost: 'fillInFormForPost',
    findYourLocalCourt: 'findYourLocalCourt',
    sendTheCompletedFormToTheCourt: 'sendTheCompletedFormToTheCourt',
  },
  beforeGet: async req => {
    const release1bEnabled = await getLaunchDarklyFlag(req, RELEASE_1B_ENABLED, false);
    if (!release1bEnabled) {
      const caseReference = req.res?.locals.validatedCase?.id;
      throw new Error(
        `Suspend general applications are not enabled for ${getStepUrl('choose-an-application', flowConfig, caseReference)}`
      );
    }
  },
  extendGetContent: async (_req: Request) => {
    const suspendFee = await getSuspendApplicationFee();
    return {
      suspendFee,
    };
  },
});
