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

/** The pages the claimant is sent to by a redirect, never as the next page in order. */
const REACHED_BY_REDIRECT_ONLY = (): boolean => false;

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
    'claimant-name': { showCondition: isIndividual },
    'organisation-name': { showCondition: isOrganisation },
    'tenancy-type': { showCondition: isEnglandClaim },
    'tenancy-start-date': { showCondition: isEnglandClaim },
    'tenancy-agreement': { showCondition: isEnglandClaim },
    'upload-tenancy-agreement': { showCondition: req => isEnglandClaim(req) && hasTenancyAgreement(req) },
    'occupation-contract-type': { showCondition: isWalesClaim },
    'occupation-contract-start-date': { showCondition: isWalesClaim },
    'occupation-contract-agreement': { showCondition: isWalesClaim },
    'upload-occupation-contract': { showCondition: req => isWalesClaim(req) && hasTenancyAgreement(req) },
    'excluded-grounds-claim': { showCondition: isExcludedTenancy },
    'excluded-grounds': { showCondition: hasExcludedGrounds },
    'excluded-reason': { showCondition: isExcludedTenancy },
    'mandatory-documents': { showCondition: isWalesClaim },
    'epc-available': { showCondition: isWalesClaim },
    'upload-epc': { showCondition: hasWalesDocument('hasEnergyPerformanceCertificate') },
    'gas-safety-available': { showCondition: isWalesClaim },
    'upload-gas-safety': { showCondition: hasWalesDocument('hasGasSafetyReport') },
    'eicr-available': { showCondition: isWalesClaim },
    'upload-eicr': { showCondition: hasWalesDocument('hasElectricalInstallationConditionReport') },
    'rent-arrears-claim': { showCondition: req => isEnglandClaim(req) && asksAssuredGrounds(req) },
    'rent-arrears-grounds': { showCondition: asksEnglandRentArrearsGrounds },
    'other-grounds-claim': { showCondition: asksEnglandRentArrearsGrounds },
    'other-grounds': { showCondition: asksEnglandOtherGrounds },
    'wales-grounds': { showCondition: isWalesClaim },
    'ground-reason': { showCondition: needsGroundReasons },
    'notice-type': { showCondition: noticeServed },
    'notice-method': { showCondition: noticeServed },
    'notice-available': { showCondition: noticeServed },
    'upload-notice': { showCondition: hasNoticeCopy },
    'arrears-at-notice': { showCondition: noticeServed },
    'upload-rent-statement': { showCondition: uploadsRentStatement },
    'rent-due-day': { showCondition: asksRentDueDay },
    'statement-period': { showCondition: usesTable },
    'rent-statement': { showCondition: usesTable },
    'rent-statement-payment': { showCondition: REACHED_BY_REDIRECT_ONLY },
    'additional-claimant-type': { showCondition: REACHED_BY_REDIRECT_ONLY },
    'additional-claimant-name': { showCondition: REACHED_BY_REDIRECT_ONLY },
    'additional-claimant-organisation-name': { showCondition: REACHED_BY_REDIRECT_ONLY },
    'additional-claimant-address': { showCondition: REACHED_BY_REDIRECT_ONLY },
    'additional-claimant-email': { showCondition: REACHED_BY_REDIRECT_ONLY },
    'additional-claimant-phone': { showCondition: REACHED_BY_REDIRECT_ONLY },
    'additional-claimant-text-message': { showCondition: REACHED_BY_REDIRECT_ONLY },
    'remove-defendant': { showCondition: REACHED_BY_REDIRECT_ONLY },
    'remove-claimant': { showCondition: REACHED_BY_REDIRECT_ONLY },
  },
};

export function taskListPath(caseReference: string): string {
  return getStepUrl('task-list', flowConfig, caseReference);
}
