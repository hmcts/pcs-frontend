import { Request } from 'express';

import { hasAnyRentArrearsGround, isNoticeDateProvided, normalizeYesNoNotSureValue } from '../utils';

export function getConfirmNoticeGivenAnswer(req: Request): 'yes' | 'no' | 'imNotSure' | undefined {
  const mappedAnswer = req.res?.locals?.validatedCase?.defendantResponsesConfirmNoticeGiven;
  if (mappedAnswer === 'yes' || mappedAnswer === 'no' || mappedAnswer === 'imNotSure') {
    return mappedAnswer;
  }

  const legacyNestedAnswer = normalizeYesNoNotSureValue(
    req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.confirmNoticeGiven ??
      req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.possessionNoticeReceived
  );
  if (legacyNestedAnswer) {
    return legacyNestedAnswer;
  }

  return undefined;
}

export function isNoticeDateConfirmedAndProvided(req: Request): boolean {
  if (getConfirmNoticeGivenAnswer(req) !== 'yes') {
    return false;
  }

  return isNoticeDateProvided(req);
}

export function isNoticeDateConfirmedAndNotProvided(req: Request): boolean {
  if (getConfirmNoticeGivenAnswer(req) !== 'yes') {
    return false;
  }

  return !isNoticeDateProvided(req);
}

export function hasRejectedRepaymentAgreement(req: Request): boolean {
  const ccdAnswer =
    req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.paymentAgreement
      ?.repaymentPlanAgreed;
  return ccdAnswer === 'NO';
}

export function hasConfirmedInstallmentOffer(req: Request): boolean {
  const ccdAnswer =
    req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.paymentAgreement
      ?.repayArrearsInstalments;
  return ccdAnswer === 'YES';
}

export function shouldShowInstallmentPaymentsStep(req: Request): boolean {
  return hasRejectedRepaymentAgreement(req) && hasAnyRentArrearsGround(req);
}
