import type { Request } from 'express';

import { getValidatedCaseHouseholdCircumstances } from './getValidatedCaseHouseholdCircumstances';
import { hasSelectedUniversalCredit } from './hasSelectedUniversalCredit';
import { fromYesNoEnum } from './yesNoEnum';

function formRegularIncomeIncludesUniversalCredit(selected: unknown): boolean {
  if (Array.isArray(selected)) {
    return selected.includes('universalCredit');
  }
  return selected === 'universalCredit';
}

async function isUniversalCreditSelectedForRegularIncomeRouting(
  req: Request,
  currentStepData: Record<string, unknown>
): Promise<boolean> {
  const fromForm = currentStepData.regularIncome;
  if (fromForm !== undefined && fromForm !== null) {
    return formRegularIncomeIncludesUniversalCredit(fromForm);
  }
  return hasSelectedUniversalCredit(req);
}

function priorityDebtsAnswerFromForm(currentStepData: Record<string, unknown>): 'yes' | 'no' | undefined {
  const v = currentStepData.havePriorityDebts;
  if (v === 'yes' || v === 'no') {
    return v;
  }
  return undefined;
}

function priorityDebtsAnswerFromCase(req: Request): 'yes' | 'no' | undefined {
  return fromYesNoEnum(getValidatedCaseHouseholdCircumstances(req)?.priorityDebts);
}

export async function shouldRouteToPriorityDebts(
  req: Request,
  _formData: Record<string, unknown>,
  currentStepData: Record<string, unknown>
): Promise<boolean> {
  return isUniversalCreditSelectedForRegularIncomeRouting(req, currentStepData);
}

export async function shouldRouteToUniversalCreditQuestion(
  req: Request,
  _formData: Record<string, unknown>,
  currentStepData: Record<string, unknown>
): Promise<boolean> {
  return !(await isUniversalCreditSelectedForRegularIncomeRouting(req, currentStepData));
}

export async function shouldRouteToPriorityDebtDetails(
  req: Request,
  _formData: Record<string, unknown>,
  currentStepData: Record<string, unknown>
): Promise<boolean> {
  const fromForm = priorityDebtsAnswerFromForm(currentStepData);
  if (fromForm !== undefined) {
    return fromForm === 'yes';
  }
  return priorityDebtsAnswerFromCase(req) === 'yes';
}

export async function shouldRouteToOtherRegularExpenses(
  req: Request,
  _formData: Record<string, unknown>,
  currentStepData: Record<string, unknown>
): Promise<boolean> {
  const fromForm = priorityDebtsAnswerFromForm(currentStepData);
  if (fromForm !== undefined) {
    return fromForm === 'no';
  }
  return priorityDebtsAnswerFromCase(req) === 'no';
}
