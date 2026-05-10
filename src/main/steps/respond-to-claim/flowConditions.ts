import { Request } from 'express';

import {
  fromYesNoEnum,
  getValidatedCaseHouseholdCircumstances,
  hasAnyRentArrearsGround,
  isFinanceDetailsProvided,
  isNoticeDateProvided,
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

  // Fast path: when user just submitted what-regular-income-do-you-receive, the body
  // tells us whether UC was ticked — don't wait for the CCD-backed validatedCase refresh,
  // which only happens after the save round-trip and isn't guaranteed for nested fields.
  const regularIncome = req.body?.regularIncome;
  if (regularIncome !== undefined) {
    const incomeArray = Array.isArray(regularIncome) ? regularIncome : [regularIncome];
    if (incomeArray.includes('universalCredit')) {
      return false;
    }
  }

  const hc = getValidatedCaseHouseholdCircumstances(req);
  return fromYesNoEnum(hc?.universalCredit) !== 'yes';
}

export function shouldShowPriorityDebtDetailsStep(req: Request): boolean {
  if (!hasProvidedFinanceDetails(req)) {
    return false;
  }

  // Fast path: when user just submitted priority-debts, the body tells us the answer
  // immediately. Mirrors the req.body-first pattern in hasProvidedFinanceDetails so
  // the next-step routing doesn't depend on validatedCase being fully refreshed for
  // nested defendantResponses.householdCircumstances fields.
  const havePriorityDebts = req.body?.havePriorityDebts;
  if (havePriorityDebts === 'yes') {
    return true;
  }
  if (havePriorityDebts === 'no') {
    return false;
  }

  const hc = getValidatedCaseHouseholdCircumstances(req);
  return fromYesNoEnum(hc?.priorityDebts) === 'yes';
}
