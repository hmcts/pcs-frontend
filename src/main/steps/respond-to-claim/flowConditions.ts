import { Request } from 'express';

import {
  hasAnyRentArrearsGround,
  hasSelectedUniversalCredit,
  isFinanceDetailsProvided,
  isNoticeDateProvided,
  isUniversalCreditSelected,
  normalizeYesNoValue,
} from '../utils';

export function isNoticeDateConfirmedAndProvided(req: Request): boolean {
  if (req.res?.locals?.validatedCase?.defendantResponsesPossessionNoticeReceived !== 'yes') {
    return false;
  }

  return isNoticeDateProvided(req);
}

export function isNoticeDateConfirmedAndNotProvided(req: Request): boolean {
  if (req.res?.locals?.validatedCase?.defendantResponsesPossessionNoticeReceived !== 'yes') {
    return false;
  }

  return !isNoticeDateProvided(req);
}

export function hasRejectedRepaymentAgreement(req: Request): boolean {
  const ccdAnswer =
    req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.paymentAgreement
      ?.repaymentPlanAgreed;
  return normalizeYesNoValue(ccdAnswer) === 'NO';
}

export function hasConfirmedInstallmentOffer(req: Request): boolean {
  const ccdAnswer =
    req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.paymentAgreement
      ?.repayArrearsInstalments;
  return normalizeYesNoValue(ccdAnswer) === 'YES';
}

export function shouldShowInstallmentPaymentsStep(req: Request): boolean {
  return hasRejectedRepaymentAgreement(req) && hasAnyRentArrearsGround(req);
}

export function hasProvidedFinanceDetails(req: Request): boolean {
  return isFinanceDetailsProvided(req);
}

export function shouldShowUniversalCreditStep(req: Request): boolean {
  if (!hasProvidedFinanceDetails(req)) {
    return false;
  }

  return !isUniversalCreditSelected(req) && !hasSelectedUniversalCredit(req);
}

export function hasAppliedForCounterClaimHwf(req: Request): boolean {
  const caseData = req.res?.locals?.validatedCase?.data;
  const counterClaim = caseData?.possessionClaimResponse?.defendantResponses?.counterClaim;
  return counterClaim?.appliedForHwf === 'YES';
}

export function hasNotAppliedForCounterClaimHwf(req: Request): boolean {
  const caseData = req.res?.locals?.validatedCase?.data;
  const counterClaim = caseData?.possessionClaimResponse?.defendantResponses?.counterClaim;
  return counterClaim?.appliedForHwf === 'NO';
}
