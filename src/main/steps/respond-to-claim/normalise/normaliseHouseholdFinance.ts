import type { HouseholdCircumstances, PossessionClaimResponse } from '@services/ccdCase.interface';

export function normaliseHouseholdFinance(response: PossessionClaimResponse): void {
  const hc = response.defendantResponses?.householdCircumstances;
  if (!hc) {
    return;
  }

  // Defendant declined to share finance details → entire finance branch is skipped
  if (hc.shareIncomeExpenseDetails !== 'YES') {
    dropEntireFinanceBranch(hc);
    return;
  }

  // Universal credit not claimed → UC application date is not asked
  if (hc.universalCredit !== 'YES') {
    delete hc.ucApplicationDate;
  }
}

// Extracted because the block is 15 lines — kept inline would dwarf the rule above.
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
  delete hc.ucApplicationDate;
  delete hc.otherBenefits;
  delete hc.otherBenefitsAmount;
  delete hc.otherBenefitsFrequency;
  delete hc.moneyFromElsewhere;
  delete hc.moneyFromElsewhereDetails;
};
