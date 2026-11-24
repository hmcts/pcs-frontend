import type { Request } from 'express';

import { readClaim } from './claimDraft';
import { TABLE_FREQUENCIES } from './rentHistory';

import { type ProofType, groundsNeedingReasons } from '@services/citizenPossessionClaim.interface';

export const isIndividual = (req: Request): boolean =>
  readClaim(req).claimant?.individualOrOrganisation === 'INDIVIDUAL';

export const isOrganisation = (req: Request): boolean =>
  readClaim(req).claimant?.individualOrOrganisation === 'ORGANISATION';

export const hasPhoneNumber = (req: Request): boolean => {
  const claimant = readClaim(req).claimant;
  return claimant?.contactByPhone === 'YES' && Boolean(claimant.phoneNumber);
};

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

const proofTypeOf = (req: Request) => readClaim(req).rentArrears?.proofType;

export const uploadsRentStatement = (req: Request): boolean => proofTypeOf(req) === 'UPLOAD_STATEMENT';

/** Whether a rent statement can be created in rent periods: not for rent paid at some other frequency. */
export const canUseTable = (req: Request): boolean => {
  const frequency = readClaim(req).rentArrears?.rentFrequency;
  return frequency !== undefined && TABLE_FREQUENCIES.includes(frequency);
};

export const usesTable = (req: Request): boolean => proofTypeOf(req) === 'TABLE' && canUseTable(req);

/** Upload a rent statement, or create one, which needs rent paid weekly, fortnightly or monthly. */
export function offeredProofTypes(req: Request): ProofType[] {
  return canUseTable(req) ? ['UPLOAD_STATEMENT', 'TABLE'] : ['UPLOAD_STATEMENT'];
}

/** The rent due day is asked only to lay a created rent statement out in months. */
export const asksRentDueDay = (req: Request): boolean =>
  usesTable(req) && readClaim(req).rentArrears?.rentFrequency === 'MONTHLY';

export const needsGroundReasons = (req: Request): boolean =>
  asksOtherGrounds(req) && groundsNeedingReasons(readClaim(req).grounds).length > 0;
