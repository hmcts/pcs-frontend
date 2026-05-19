import { Request } from 'express';

import {
  hasAnyRentArrearsGround,
  hasMultipleParties,
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

export function shouldShowPriorityDebtDetailsStep(req: Request): boolean {
  if (!hasProvidedFinanceDetails(req)) {
    return false;
  }

  return isPriorityDebtsSelected(req) || hasSelectedPriorityDebts(req);
}

function getCounterClaimNeedHelpWithFees(req: Request) {
  return req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.counterClaim
    ?.needHelpWithFees;
}

export function shouldShowCounterClaimHelpWithFeesStep(req: Request): boolean {
  return getCounterClaimNeedHelpWithFees(req) === 'YES';
}

export function shouldShowCounterClaimNeedToApplyStep(req: Request): boolean {
  return shouldShowCounterClaimHelpWithFeesStep(req) && hasNotAppliedForCounterClaimHwf(req);
}

export function shouldShowCounterClaimAgainstWhoStep(req: Request): boolean {
  return getCounterClaimNeedHelpWithFees(req) === 'NO' && hasMultipleParties(req);
}

export function shouldShowCounterClaimAboutStep(req: Request): boolean {
  return getCounterClaimNeedHelpWithFees(req) === 'NO';
}
