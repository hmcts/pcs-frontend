import { type Request } from 'express';

import { MAKE_A_CLAIM_ROUTE } from '../../constants/makeAClaimRoutes';

import { MAKE_A_CLAIM_EVENT_ID } from './claimDraft';
import {
  asksAssuredGrounds,
  asksEnglandOtherGrounds,
  asksEnglandRentArrearsGrounds,
  asksRentDueDay,
  hasExcludedGrounds,
  hasNoticeCopy,
  hasTenancyAgreement,
  hasWalesDocument,
  isEnglandClaim,
  isExcludedTenancy,
  isIndividual,
  isOrganisation,
  isWalesClaim,
  needsGroundReasons,
  noticeServed,
  uploadsRentStatement,
  usesTable,
} from './conditions';
import { makeAClaimSections } from './sections.config';

import { getStepUrl } from '@modules/steps/flow';
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
  nonSectionStepOrder: ['eligible', 'task-list', 'remove-defendant', 'remove-claimant'],
  hubStepName: 'task-list',
  steps: {
    'claimant-name': { showCondition: (req: Request) => isIndividual(req) },
    'organisation-name': { showCondition: (req: Request) => isOrganisation(req) },
    'tenancy-type': { showCondition: (req: Request) => isEnglandClaim(req) },
    'tenancy-start-date': { showCondition: (req: Request) => isEnglandClaim(req) },
    'tenancy-agreement': { showCondition: (req: Request) => isEnglandClaim(req) },
    'upload-tenancy-agreement': { showCondition: (req: Request) => isEnglandClaim(req) && hasTenancyAgreement(req) },
    'occupation-contract-type': { showCondition: (req: Request) => isWalesClaim(req) },
    'occupation-contract-start-date': { showCondition: (req: Request) => isWalesClaim(req) },
    'occupation-contract-agreement': { showCondition: (req: Request) => isWalesClaim(req) },
    'upload-occupation-contract': { showCondition: (req: Request) => isWalesClaim(req) && hasTenancyAgreement(req) },
    'excluded-grounds-claim': { showCondition: (req: Request) => isExcludedTenancy(req) },
    'excluded-grounds': { showCondition: (req: Request) => hasExcludedGrounds(req) },
    'excluded-reason': { showCondition: (req: Request) => isExcludedTenancy(req) },
    'mandatory-documents': { showCondition: (req: Request) => isWalesClaim(req) },
    'epc-available': { showCondition: (req: Request) => isWalesClaim(req) },
    'upload-epc': { showCondition: hasWalesDocument('hasEnergyPerformanceCertificate') },
    'gas-safety-available': { showCondition: (req: Request) => isWalesClaim(req) },
    'upload-gas-safety': { showCondition: hasWalesDocument('hasGasSafetyReport') },
    'eicr-available': { showCondition: (req: Request) => isWalesClaim(req) },
    'upload-eicr': { showCondition: hasWalesDocument('hasElectricalInstallationConditionReport') },
    'rent-arrears-claim': { showCondition: (req: Request) => isEnglandClaim(req) && asksAssuredGrounds(req) },
    'rent-arrears-grounds': { showCondition: (req: Request) => asksEnglandRentArrearsGrounds(req) },
    'other-grounds-claim': { showCondition: (req: Request) => asksEnglandRentArrearsGrounds(req) },
    'other-grounds': { showCondition: (req: Request) => asksEnglandOtherGrounds(req) },
    'wales-grounds': { showCondition: (req: Request) => isWalesClaim(req) },
    'ground-reason': { showCondition: (req: Request) => needsGroundReasons(req) },
    'notice-type': { showCondition: (req: Request) => noticeServed(req) },
    'notice-method': { showCondition: (req: Request) => noticeServed(req) },
    'notice-available': { showCondition: (req: Request) => noticeServed(req) },
    'upload-notice': { showCondition: (req: Request) => hasNoticeCopy(req) },
    'arrears-at-notice': { showCondition: (req: Request) => noticeServed(req) },
    'upload-rent-statement': { showCondition: (req: Request) => uploadsRentStatement(req) },
    'rent-due-day': { showCondition: (req: Request) => asksRentDueDay(req) },
    'statement-period': { showCondition: (req: Request) => usesTable(req) },
    'rent-statement': { showCondition: (req: Request) => usesTable(req) },
    'rent-statement-payment': { showCondition: () => false },
    'additional-claimant-type': { showCondition: () => false },
    'additional-claimant-name': { showCondition: () => false },
    'additional-claimant-organisation-name': { showCondition: () => false },
    'additional-claimant-address': { showCondition: () => false },
    'additional-claimant-email': { showCondition: () => false },
    'additional-claimant-phone': { showCondition: () => false },
    'additional-claimant-text-message': { showCondition: () => false },
    'remove-defendant': { showCondition: () => false },
    'remove-claimant': { showCondition: () => false },
  },
};

export function taskListPath(caseReference: string): string {
  return getStepUrl('task-list', flowConfig, caseReference);
}
