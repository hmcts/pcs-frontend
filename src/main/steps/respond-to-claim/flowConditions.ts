import { Request } from 'express';

import {
  hasAnyRentArrearsGround,
  hasSelectedPriorityDebts,
  hasSelectedUniversalCredit,
  isFinanceDetailsProvided,
  isNoticeDateProvided,
  isPriorityDebtsSelected,
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
  if (req.body?.confirmInstallmentOffer === 'yes') {
    return true;
  }

  const possessionClaimResponse = req.res?.locals?.validatedCase?.data?.possessionClaimResponse as
    | {
        defendantResponses?: { paymentAgreement?: { repayArrearsInstalments?: string } };
        paymentAgreement?: { repayArrearsInstalments?: string };
      }
    | undefined;
  const ccdAnswer =
    possessionClaimResponse?.defendantResponses?.paymentAgreement?.repayArrearsInstalments ??
    possessionClaimResponse?.paymentAgreement?.repayArrearsInstalments;
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

export function shouldShowPriorityDebtDetailsStep(req: Request): boolean {
  if (!hasProvidedFinanceDetails(req)) {
    return false;
  }

  return isPriorityDebtsSelected(req) || hasSelectedPriorityDebts(req);
}
