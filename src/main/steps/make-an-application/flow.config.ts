import type { Request } from 'express';

import type { JourneyFlowConfig } from '../../interfaces/stepFlow.interface';
import { step as askToMakeAnOrder } from './ask-the-court-to-make-an-order';

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
    'upload-document-to-support-your-application',
    'upload-documents-to-support-your-application',
    'which-language-did-you-use-to-complete-this-service',
    'check-your-answers',
    'application-submitted',
  ],
  steps: {
    'choose-an-application': {
      routes: [
        {
          condition: async (_req: Request,
                            _formData: Record<string, unknown>,
                            currentStepData: Record<string, unknown>) => getTypeOfApplication(currentStepData) === 'ADJOURN',
          nextStep: 'ask-to-adjourn-the-court-hearing',
        },
        {
          condition: async (_req: Request, _formData: Record<string, unknown>,
                            currentStepData: Record<string, unknown>) => getTypeOfApplication(currentStepData) === 'SET_ASIDE',
          nextStep: 'ask-to-set-aside-the-decision-to-evict-you',
        },
        {
          condition: async (_req: Request, _formData: Record<string, unknown>,
                            currentStepData: Record<string, unknown>) => getTypeOfApplication(currentStepData) === 'SOMETHING_ELSE',
          nextStep: 'ask-the-court-to-make-an-order',
        },
      ],
    },
    'ask-to-adjourn-the-court-hearing': {
      defaultNext: 'is-the-court-hearing-in-the-next-14-days',
    },
    'ask-to-set-aside-the-decision-to-evict-you': {
      defaultNext: 'do-you-need-help-paying-the-fee',
    },
    'is-the-court-hearing-in-the-next-14-days': {
      routes: [
        {
          condition: async (req: Request) => isHearingInNext14Days(req),
          nextStep: 'do-you-need-help-paying-the-fee',
        },
        {
          condition: async (req: Request) => !isHearingInNext14Days(req),
          nextStep: 'have-the-other-parties-agreed-to-this-application',
        },
      ],
    },
    'do-you-need-help-paying-the-fee': {
      routes: [
        {
          condition: async (req: Request) => needHelpPayingTheFee(req),
          nextStep: 'have-you-already-applied-for-help',
        },
        {
          condition: async (req: Request) => !needHelpPayingTheFee(req),
          nextStep: 'have-the-other-parties-agreed-to-this-application',
        },
      ],
    },
    'have-you-already-applied-for-help': {
      routes: [
        {
          condition: async (req: Request) => alreadyAppliedForHelpWithFees(req),
          nextStep: 'have-the-other-parties-agreed-to-this-application',
        },
        {
          condition: async (req: Request) => !alreadyAppliedForHelpWithFees(req),
          nextStep: 'you-need-to-apply-for-help-with-your-application-fee',
        },
      ],
    },
    'you-need-to-apply-for-help-with-your-application-fee': {},
    'have-the-other-parties-agreed-to-this-application': {
      routes: [
        {
          condition: async (req: Request) => otherPartiesAgreed(req),
          nextStep: 'what-order-do-you-want-the-court-to-make-and-why',
        },
        {
          condition: async (req: Request) => !otherPartiesAgreed(req),
          nextStep: 'are-there-any-reasons-that-this-application-should-not-be-shared',
        },
      ],
    },
    'are-there-any-reasons-that-this-application-should-not-be-shared': {
      defaultNext: 'what-order-do-you-want-the-court-to-make-and-why'
    },
    'what-order-do-you-want-the-court-to-make-and-why': {
      defaultNext: 'upload-document-to-support-your-application'
    },
    'upload-document-to-support-your-application': {
      routes: [
        {
          condition: async (req: Request) => documentUploadWanted(req),
          nextStep: 'upload-documents-to-support-your-application',
        },
        {
          condition: async (req: Request) => !documentUploadWanted(req),
          nextStep: 'which-language-did-you-use-to-complete-this-service',
        },
      ],
    },
    'upload-documents-to-support-your-application': {
      defaultNext: 'which-language-did-you-use-to-complete-this-service'
    },
    'which-language-did-you-use-to-complete-this-service': {
      defaultNext: 'check-your-answers'
    },
    'check-your-answers': {},
  },
};

function getTypeOfApplication(currentStepData: Record<string, unknown>): string {
  return <string>currentStepData.typeOfApplication;
}

function isHearingInNext14Days(req: Request): boolean {
  return req.session?.formData?.['is-the-court-hearing-in-the-next-14-days']['courtHearingInNext14Days'] === 'YES';
}

function needHelpPayingTheFee(req: Request): boolean {
  return req.session?.formData?.['do-you-need-help-paying-the-fee']['helpWithFeesNeeded'] === 'YES';
}

function alreadyAppliedForHelpWithFees(req: Request): boolean {
  return req.session?.formData?.['have-you-already-applied-for-help']['alreadyAppliedForHelp'] === 'YES';
}

function otherPartiesAgreed(req: Request): boolean {
  return req.session?.formData?.['have-the-other-parties-agreed-to-this-application']['otherPartiesAgreed'] === 'YES';
}

function documentUploadWanted(req: Request): boolean {
  return req.session?.formData?.['upload-document-to-support-your-application']['uploadDocuments'] === 'YES';
}
