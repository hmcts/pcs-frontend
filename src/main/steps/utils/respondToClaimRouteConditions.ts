import type { Request } from 'express';

const hasSelectedUniversalCredit = (selected: unknown): boolean => {
  if (Array.isArray(selected)) {
    return selected.includes('universalCredit');
  }
  return selected === 'universalCredit';
};

export async function shouldRouteToPriorityDebts(
  _req: Request,
  _formData: Record<string, unknown>,
  currentStepData: Record<string, unknown>
): Promise<boolean> {
  return hasSelectedUniversalCredit(currentStepData.regularIncome);
}

export async function shouldRouteToUniversalCreditQuestion(
  _req: Request,
  _formData: Record<string, unknown>,
  currentStepData: Record<string, unknown>
): Promise<boolean> {
  return !hasSelectedUniversalCredit(currentStepData.regularIncome);
}

export async function shouldRouteToPriorityDebtDetails(
  _req: Request,
  _formData: Record<string, unknown>,
  currentStepData: Record<string, unknown>
): Promise<boolean> {
  return currentStepData.havePriorityDebts === 'yes';
}

export async function shouldRouteToOtherRegularExpenses(
  _req: Request,
  _formData: Record<string, unknown>,
  currentStepData: Record<string, unknown>
): Promise<boolean> {
  return currentStepData.havePriorityDebts === 'no';
}
