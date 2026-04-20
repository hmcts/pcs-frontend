import { Request } from 'express';

import { hasAnyRentArrearsGround, isNoticeDateProvided, normalizeYesNoNotSureValue } from '../utils';

export function getContactByTelephoneAnswer(req: Request): 'yes' | 'no' | undefined {
  const fromCcd = req.res?.locals?.validatedCase?.isDefendantContactByPhone;
  if (fromCcd === true) {
    return 'yes';
  }
  if (fromCcd === false) {
    return 'no';
  }

  return undefined;
}

export function getConfirmNoticeGivenAnswer(req: Request): 'yes' | 'no' | 'imNotSure' | undefined {
  const ccdAnswer = req.res?.locals?.validatedCase?.defendantResponsesConfirmNoticeGiven;
  if (ccdAnswer === 'yes' || ccdAnswer === 'no' || ccdAnswer === 'imNotSure') {
    return ccdAnswer;
  }

  const ccdNestedAnswer = normalizeYesNoNotSureValue(
    req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.confirmNoticeGiven ??
      req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.possessionNoticeReceived
  );
  if (ccdNestedAnswer) {
    return ccdNestedAnswer;
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

export function shouldShowHowMuchAffordToPayStep(req: Request): boolean {
  return hasConfirmedInstallmentOffer(req);
}
