import { type Request } from 'express';

import {
  hasAnyRentArrearsGround,
  hasOnlyRentArrearsGrounds,
  hasSkippedEqualityAndDiversityQuestions,
  isDefendantNameKnown,
  isNoticeServed,
  isTenancyStartDateKnown,
  isWalesProperty,
} from '../utils';

import {
  hasConfirmedInstallmentOffer,
  isNoticeDateConfirmedAndNotProvided,
  isNoticeDateConfirmedAndProvided,
  shouldShowInstallmentPaymentsStep,
} from './flowConditions';
import { respondToClaimSections } from './sections.config';
import { respondToClaimStepOrder } from './stepOrder';

import type { JourneyFlowConfig } from '@modules/steps/stepFlow.interface';

export const RESPOND_TO_CLAIM_ROUTE = '/case/:caseReference/respond-to-claim';

export const flowConfig: JourneyFlowConfig = {
  basePath: RESPOND_TO_CLAIM_ROUTE,
  journeyName: 'respondToClaim',
  useShowConditions: true,
  useSessionFormData: false,
  sections: respondToClaimSections,
  stepOrder: [...respondToClaimStepOrder],
  steps: {
    'defendant-name-confirmation': {
      showCondition: (req: Request) => isDefendantNameKnown(req),
    },
    'defendant-name-capture': {
      showCondition: (req: Request) => !isDefendantNameKnown(req),
    },
    'contact-preferences-text-message': {
      showCondition: (req: Request) => req.res?.locals?.validatedCase?.isDefendantContactByPhone === true,
    },
    'landlord-registered': {
      showCondition: (req: Request) => isWalesProperty(req),
    },
    'landlord-licensed': {
      showCondition: (req: Request) => isWalesProperty(req),
    },
    'written-terms': {
      showCondition: (req: Request) => isWalesProperty(req),
    },
    'tenancy-date-unknown': {
      showCondition: (req: Request) => !isTenancyStartDateKnown(req),
    },
    'tenancy-date-details': {
      showCondition: (req: Request) => isTenancyStartDateKnown(req),
    },
    'confirmation-of-notice-given': {
      showCondition: (req: Request) => isNoticeServed(req),
    },

    'confirmation-of-notice-date-when-provided': {
      showCondition: (req: Request) => isNoticeDateConfirmedAndProvided(req),
    },
    'confirmation-of-notice-date-when-not-provided': {
      showCondition: (req: Request) => isNoticeDateConfirmedAndNotProvided(req),
    },
    'rent-arrears-dispute': {
      showCondition: (req: Request) => hasAnyRentArrearsGround(req),
    },
    'non-rent-arrears-dispute': {
      showCondition: (req: Request) => !hasOnlyRentArrearsGrounds(req),
    },
    'installment-payments': {
      showCondition: (req: Request) => shouldShowInstallmentPaymentsStep(req),
    },
    'how-much-afford-to-pay': {
      showCondition: (req: Request) => hasConfirmedInstallmentOffer(req),
    },
    'equality-and-diversity-end': {
      showCondition: (req: Request) => !hasSkippedEqualityAndDiversityQuestions(req),
    },
  },
};
