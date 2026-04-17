import { Request } from 'express';

import { hasAnyRentArrearsGround, isNoticeDateProvided, normalizeYesNoNotSureValue } from '../utils';

export function getContactByTelephoneAnswer(
  req: Request,
  currentStepData: Record<string, unknown> = {}
): 'yes' | 'no' | undefined {
  const currentAnswer = currentStepData.contactByTelephone;
  if (currentAnswer === 'yes' || currentAnswer === 'no') {
    return currentAnswer;
  }

  const fromCcd = req.res?.locals?.validatedCase?.isDefendantContactByPhone;
  if (fromCcd === true) {
    return 'yes';
  }
  if (fromCcd === false) {
    return 'no';
  }

  return undefined;
}

export function getConfirmNoticeGivenAnswer(
  req: Request,
  currentStepData: Record<string, unknown> = {}
): 'yes' | 'no' | 'imNotSure' | undefined {
  const currentAnswer = normalizeYesNoNotSureValue(
    currentStepData.confirmNoticeGiven ?? currentStepData.possessionNoticeReceived
  );
  if (currentAnswer) {
    return currentAnswer;
  }

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

export async function isNoticeDateConfirmedAndProvided(
  req: Request,
  currentStepData: Record<string, unknown> = {}
): Promise<boolean> {
  if (getConfirmNoticeGivenAnswer(req, currentStepData) !== 'yes') {
    return false;
  }

  return isNoticeDateProvided(req);
}

export async function isNoticeDateConfirmedAndNotProvided(
  req: Request,
  currentStepData: Record<string, unknown> = {}
): Promise<boolean> {
  if (getConfirmNoticeGivenAnswer(req, currentStepData) !== 'yes') {
    return false;
  }

  return !(await isNoticeDateProvided(req));
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

export async function shouldShowInstallmentPaymentsStep(
  req: Request,
  currentStepData: Record<string, unknown> = {}
): Promise<boolean> {
  const repaymentsAgreed = currentStepData.repaymentsAgreed;

  if (repaymentsAgreed === 'yes' || repaymentsAgreed === 'imNotSure') {
    return false;
  }

  if (repaymentsAgreed === 'no') {
    return hasAnyRentArrearsGround(req);
  }

  return hasRejectedRepaymentAgreement(req) && hasAnyRentArrearsGround(req);
}

export function shouldShowHowMuchAffordToPayStep(req: Request, currentStepData: Record<string, unknown> = {}): boolean {
  const offer = currentStepData.confirmInstallmentOffer;

  if (offer === 'yes') {
    return true;
  }
  if (offer === 'no') {
    return false;
  }

  return hasConfirmedInstallmentOffer(req);
}
