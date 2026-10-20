import type { HouseholdCircumstances } from '@services/ccdCase.interface';

function hasNonEmptyMoney(value: unknown): boolean {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function hasDebtContributionFrequency(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  const normalized = value.toUpperCase();
  return normalized === 'WEEKLY' || normalized === 'MONTHLY';
}

/** True when both mandatory priority-debt amounts and frequency are present. */
export function hasMandatoryPriorityDebtDetailFields(
  householdCircumstances: HouseholdCircumstances | undefined | null
): boolean {
  if (!householdCircumstances) {
    return false;
  }
  return (
    hasNonEmptyMoney(householdCircumstances.debtTotal) &&
    hasNonEmptyMoney(householdCircumstances.debtContribution) &&
    hasDebtContributionFrequency(householdCircumstances.debtContributionFrequency)
  );
}
