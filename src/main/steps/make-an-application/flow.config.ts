import type { Request } from 'express';

import type { JourneyFlowConfig } from '../../interfaces/stepFlow.interface';

import { getFormData } from '@modules/steps';

export const MAKE_AN_APPLICATION_ROUTE = '/case/:caseReference/make-an-application';

export const flowConfig: JourneyFlowConfig = {
  basePath: MAKE_AN_APPLICATION_ROUTE,
  useShowConditions: true,
  journeyName: 'makeAnApplication',
  stepOrder: [
    'choose-an-application',
    'ask-to-adjourn-the-court-hearing',
    'ask-to-set-aside-the-decision-to-evict-you',
    'ask-the-court-to-make-an-order',
    'is-the-court-hearing-in-the-next-14-days',
    'do-you-need-help-paying-the-fee',
    'have-you-already-applied-for-help',
    'you-need-to-apply-for-help-with-your-application-fee',
    'have-the-other-parties-agreed-to-this-application',
    'are-there-any-reasons-that-this-application-should-not-be-shared',
    'what-order-do-you-want-the-court-to-make-and-why',
    'do-you-want-to-upload-documents-to-support-your-application',
    'upload-documents-to-support-your-application',
    'which-language-did-you-use-to-complete-this-service',
    'check-your-answers',
    'application-submitted',
  ],
  steps: {
    'ask-to-adjourn-the-court-hearing': {
      showCondition: (req: Request) => getTypeOfApplication(req) === 'ADJOURN',
    },
    'ask-to-set-aside-the-decision-to-evict-you': {
      showCondition: (req: Request) => getTypeOfApplication(req) === 'SET_ASIDE',
    },
    'ask-the-court-to-make-an-order': {
      showCondition: (req: Request) => getTypeOfApplication(req) === 'SOMETHING_ELSE',
    },
    'is-the-court-hearing-in-the-next-14-days': {
      showCondition: (req: Request) => getTypeOfApplication(req) === 'ADJOURN',
    },
    'do-you-need-help-paying-the-fee': {
      showCondition: (req: Request) => doesFeeApply(req),
    },
    'have-you-already-applied-for-help': {
      showCondition: (req: Request) => doesFeeApply(req) && needHelpPayingTheFee(req),
    },
    'you-need-to-apply-for-help-with-your-application-fee': {
      showCondition: (req: Request) =>
        doesFeeApply(req) && needHelpPayingTheFee(req) && !alreadyAppliedForHelpWithFees(req),
    },
    'are-there-any-reasons-that-this-application-should-not-be-shared': {
      showCondition: (req: Request) => !otherPartiesAgreed(req),
    },
    'upload-documents-to-support-your-application': {
      showCondition: (req: Request) => documentUploadWanted(req),
    },
    'application-submitted': {
      preventBack: true,
    },
  },
};

function getTypeOfApplication(req: Request): string {
  return getFormData(req, 'choose-an-application').typeOfApplication as string;
}

function isHearingInNext14Days(req: Request): boolean {
  return getFormData(req, 'is-the-court-hearing-in-the-next-14-days').courtHearingInNext14Days === 'yes';
}

function needHelpPayingTheFee(req: Request): boolean {
  return getFormData(req, 'do-you-need-help-paying-the-fee').helpWithFeesNeeded === 'YES';
}

function alreadyAppliedForHelpWithFees(req: Request): boolean {
  return getFormData(req, 'have-you-already-applied-for-help').alreadyAppliedForHelp === 'YES';
}

function doesFeeApply(req: Request): boolean {
  return getTypeOfApplication(req) !== 'ADJOURN' || isHearingInNext14Days(req);
}

function otherPartiesAgreed(req: Request): boolean {
  return getFormData(req, 'have-the-other-parties-agreed-to-this-application').otherPartiesAgreed === 'YES';
}

function documentUploadWanted(req: Request): boolean {
  return getFormData(req, 'do-you-want-to-upload-documents-to-support-your-application').uploadDocuments === 'YES';
}
