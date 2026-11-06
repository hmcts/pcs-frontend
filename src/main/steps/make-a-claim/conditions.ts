import type { Request } from 'express';

import { readClaim } from './claimDraft';
import { TABLE_FREQUENCIES } from './rentHistory';

import { type ProofType, groundsNeedingReasons } from '@services/citizenPossessionClaim.interface';
import type { RentHistoryDesign } from '@utils/makeAClaimFlags';

/** The rent history design the journey's route middleware resolved for this request. */
export function designOf(req: Request): RentHistoryDesign {
  return req.res?.locals.rentHistoryDesign === 'table' ? 'table' : 'ledger';
}

export const isIndividual = (req: Request): boolean =>
  readClaim(req).claimant?.individualOrOrganisation === 'INDIVIDUAL';

export const isOrganisation = (req: Request): boolean =>
  readClaim(req).claimant?.individualOrOrganisation === 'ORGANISATION';

export const wantsPhoneContact = (req: Request): boolean => readClaim(req).claimant?.contactByPhone === 'YES';

export const hasTenancyAgreement = (req: Request): boolean =>
  readClaim(req).tenancy?.tenancyAgreementAvailable === 'YES';

export const hasRentArrearsGrounds = (req: Request): boolean => readClaim(req).grounds?.hasRentArrearsGrounds === 'YES';

export const asksOtherGrounds = (req: Request): boolean => {
  const grounds = readClaim(req).grounds;
  return grounds?.hasRentArrearsGrounds === 'NO' || grounds?.hasOtherGrounds === 'YES';
};

export const noticeServed = (req: Request): boolean => readClaim(req).notice?.noticeServed === 'YES';

export const hasNoticeCopy = (req: Request): boolean =>
  noticeServed(req) && readClaim(req).notice?.noticeAvailable === 'YES';

export const asksRentDueDay = (req: Request): boolean =>
  designOf(req) === 'table' && readClaim(req).rentArrears?.rentFrequency === 'MONTHLY';

const proofTypeOf = (req: Request) => readClaim(req).rentArrears?.proofType;

export const uploadsRentStatement = (req: Request): boolean => proofTypeOf(req) === 'UPLOAD_STATEMENT';

export const usesLedger = (req: Request): boolean => designOf(req) === 'ledger' && proofTypeOf(req) === 'LEDGER';

export const ledgerIsEmpty = (req: Request): boolean => !readClaim(req).rentArrears?.rentHistoryLedger?.length;

export const usesTable = (req: Request): boolean => designOf(req) === 'table' && proofTypeOf(req) === 'TABLE';

/** Whether the table design can lay the rent out in periods: not for rent paid at some other frequency. */
export const canUseTable = (req: Request): boolean => {
  const frequency = readClaim(req).rentArrears?.rentFrequency;
  return frequency !== undefined && TABLE_FREQUENCIES.includes(frequency);
};

export const hasUnderlessee = (req: Request): boolean => readClaim(req).circumstances?.underlesseeExists === 'YES';

/** The ways of proving the arrears this claimant is offered: the rent history design's own, and upload. */
export function offeredProofTypes(req: Request): ProofType[] {
  if (designOf(req) === 'table') {
    return canUseTable(req) ? ['UPLOAD_STATEMENT', 'TABLE'] : ['UPLOAD_STATEMENT'];
  }
  return ['UPLOAD_STATEMENT', 'LEDGER'];
}

export const needsGroundReasons = (req: Request): boolean =>
  asksOtherGrounds(req) && groundsNeedingReasons(readClaim(req).grounds).length > 0;
