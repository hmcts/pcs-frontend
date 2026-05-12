import { normalizeYesNoValue } from '../../utils';

import type { HouseholdCircumstances, PossessionClaimResponse } from '@services/ccdCase.interface';

export function normaliseHouseholdFinance(response: PossessionClaimResponse): void {
  const hc = response.defendantResponses?.householdCircumstances;
  if (!hc) {
    return;
  }

  // Defendant declined to share finance details → entire finance branch is skipped
  if (normalizeYesNoValue(hc.shareIncomeExpenseDetails) !== 'YES') {
    dropEntireFinanceBranch(hc);
    return;
  }

  // Already on Universal Credit → "have-you-applied-for-universal-credit" page is skipped
  if (normalizeYesNoValue(hc.universalCredit) === 'YES') {
    delete hc.hasAppliedForUniversalCredit;
    delete hc.ucApplicationDate;
  }

  // Defendant didn't apply for Universal Credit → application date isn't asked
  if (normalizeYesNoValue(hc.hasAppliedForUniversalCredit) !== 'YES') {
    delete hc.ucApplicationDate;
  }

  // No priority debts → priority-debt-details page is skipped
  if (normalizeYesNoValue(hc.priorityDebts) !== 'YES') {
    delete hc.debtTotal;
    delete hc.debtContribution;
    delete hc.debtContributionFrequency;
  }
}

const dropEntireFinanceBranch = (hc: HouseholdCircumstances): void => {
  delete hc.incomeFromJobs;
  delete hc.incomeFromJobsAmount;
  delete hc.incomeFromJobsFrequency;
  delete hc.pension;
  delete hc.pensionAmount;
  delete hc.pensionFrequency;
  delete hc.universalCredit;
  delete hc.universalCreditAmount;
  delete hc.universalCreditFrequency;
  delete hc.hasAppliedForUniversalCredit;
  delete hc.ucApplicationDate;
  delete hc.otherBenefits;
  delete hc.otherBenefitsAmount;
  delete hc.otherBenefitsFrequency;
  delete hc.moneyFromElsewhere;
  delete hc.moneyFromElsewhereDetails;
  delete hc.priorityDebts;
  delete hc.debtTotal;
  delete hc.debtContribution;
  delete hc.debtContributionFrequency;
  delete hc.householdBills;
  delete hc.loanPayments;
  delete hc.childSpousalMaintenance;
  delete hc.mobilePhone;
  delete hc.groceryShopping;
  delete hc.fuelParkingTransport;
  delete hc.schoolCosts;
  delete hc.clothing;
  delete hc.otherExpenses;
};
