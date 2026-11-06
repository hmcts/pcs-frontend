import { type Request } from 'express';

import { MAKE_A_CLAIM_ROUTE } from '../../constants/makeAClaimRoutes';

import { MAKE_A_CLAIM_EVENT_ID } from './claimDraft';
import {
  asksOtherGrounds,
  asksRentDueDay,
  hasNoticeCopy,
  hasRentArrearsGrounds,
  hasTenancyAgreement,
  hasUnderlessee,
  isIndividual,
  isOrganisation,
  ledgerIsEmpty,
  needsGroundReasons,
  noticeServed,
  uploadsRentStatement,
  usesLedger,
  usesTable,
  wantsPhoneContact,
} from './conditions';
import { makeAClaimSections } from './sections.config';

import type { JourneyFlowConfig } from '@modules/steps/stepFlow.interface';

export { MAKE_A_CLAIM_ROUTE };

export const MAKE_A_CLAIM_JOURNEY = 'makeAClaim';

export const flowConfig: JourneyFlowConfig = {
  basePath: MAKE_A_CLAIM_ROUTE,
  journeyName: MAKE_A_CLAIM_JOURNEY,
  useShowConditions: true,
  useSessionFormData: false,
  eventId: MAKE_A_CLAIM_EVENT_ID,
  sections: makeAClaimSections,
  nonSectionStepOrder: ['task-list', 'multiple-claimants-ineligible', 'remove-defendant', 'remove-ledger-entry'],
  hubStepName: 'task-list',
  steps: {
    'claimant-name': { showCondition: (req: Request) => isIndividual(req) },
    'organisation-name': { showCondition: (req: Request) => isOrganisation(req) },
    'claimant-text-message': { showCondition: (req: Request) => wantsPhoneContact(req) },
    'upload-tenancy-agreement': { showCondition: (req: Request) => hasTenancyAgreement(req) },
    'rent-arrears-grounds': { showCondition: (req: Request) => hasRentArrearsGrounds(req) },
    'other-grounds-claim': { showCondition: (req: Request) => hasRentArrearsGrounds(req) },
    'other-grounds': { showCondition: (req: Request) => asksOtherGrounds(req) },
    'ground-reason': { showCondition: (req: Request) => needsGroundReasons(req) },
    'notice-type': { showCondition: (req: Request) => noticeServed(req) },
    'notice-date': { showCondition: (req: Request) => noticeServed(req) },
    'notice-method': { showCondition: (req: Request) => noticeServed(req) },
    'notice-available': { showCondition: (req: Request) => noticeServed(req) },
    'upload-notice': { showCondition: (req: Request) => hasNoticeCopy(req) },
    'rent-due-day': { showCondition: (req: Request) => asksRentDueDay(req) },
    'arrears-at-notice': { showCondition: (req: Request) => noticeServed(req) },
    'upload-rent-statement': { showCondition: (req: Request) => uploadsRentStatement(req) },
    'ledger-transaction': { showCondition: (req: Request) => usesLedger(req) && ledgerIsEmpty(req) },
    'ledger-summary': { showCondition: (req: Request) => usesLedger(req) },
    'statement-period': { showCondition: (req: Request) => usesTable(req) },
    'rent-statement': { showCondition: (req: Request) => usesTable(req) },
    'rent-statement-payment': { showCondition: () => false },
    'underlessee-name': { showCondition: (req: Request) => hasUnderlessee(req) },
    'underlessee-address': { showCondition: (req: Request) => hasUnderlessee(req) },
    'multiple-claimants-ineligible': { showCondition: () => false, preventBack: true },
    'remove-defendant': { showCondition: () => false },
    'remove-ledger-entry': { showCondition: () => false },
  },
};
