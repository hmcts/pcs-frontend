import type { Request } from 'express';

import { readClaim } from './claimDraft';
import { TABLE_FREQUENCIES } from './rentHistory';

import { type ProofType, groundsNeedingReasons, isExcludedClaim } from '@services/citizenPossessionClaim.interface';

export const isIndividual = (req: Request): boolean =>
  readClaim(req).claimant?.individualOrOrganisation === 'INDIVIDUAL';

export const isOrganisation = (req: Request): boolean =>
  readClaim(req).claimant?.individualOrOrganisation === 'ORGANISATION';

export const hasPhoneNumber = (req: Request): boolean => {
  const claimant = readClaim(req).claimant;
  return claimant?.contactByPhone === 'YES' && Boolean(claimant.phoneNumber);
};

/** Whether the claim is for a property in Wales, which asks about the occupation contract instead of the tenancy. */
export const isWalesClaim = (req: Request): boolean => readClaim(req).eligibility?.legislativeCountry === 'Wales';

export const isEnglandClaim = (req: Request): boolean => !isWalesClaim(req);

export const hasTenancyAgreement = (req: Request): boolean =>
  readClaim(req).tenancy?.tenancyAgreementAvailable === 'YES';

export const isExcludedTenancy = (req: Request): boolean => isExcludedClaim(readClaim(req));

export const hasExcludedGrounds = (req: Request): boolean =>
  isExcludedTenancy(req) && readClaim(req).grounds?.hasExcludedGrounds === 'YES';

export const asksAssuredGrounds = (req: Request): boolean => !isExcludedTenancy(req);

export const hasRentArrearsGrounds = (req: Request): boolean =>
  asksAssuredGrounds(req) && readClaim(req).grounds?.hasRentArrearsGrounds === 'YES';

export const asksOtherGrounds = (req: Request): boolean => {
  const grounds = readClaim(req).grounds;
  return asksAssuredGrounds(req) && (grounds?.hasRentArrearsGrounds === 'NO' || grounds?.hasOtherGrounds === 'YES');
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
