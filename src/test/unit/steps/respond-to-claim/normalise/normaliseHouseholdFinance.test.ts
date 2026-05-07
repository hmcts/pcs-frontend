import type { PossessionClaimResponse } from '../../../../../main/services/ccdCase.interface';
import { normaliseHouseholdFinance } from '../../../../../main/steps/respond-to-claim/normalise/normaliseHouseholdFinance';

describe('normaliseHouseholdFinance', () => {
  it('drops the entire finance branch when shareIncomeExpenseDetails is NO', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: {
        householdCircumstances: {
          shareIncomeExpenseDetails: 'NO',
          incomeFromJobs: 'YES',
          incomeFromJobsAmount: '5000',
          incomeFromJobsFrequency: 'WEEKLY',
          pension: 'YES',
          pensionAmount: '2000',
          pensionFrequency: 'MONTHLY',
          universalCredit: 'YES',
          universalCreditAmount: '1000',
          universalCreditFrequency: 'MONTHLY',
          ucApplicationDate: '2024-01-01',
          otherBenefits: 'YES',
          otherBenefitsAmount: '500',
          otherBenefitsFrequency: 'WEEKLY',
          moneyFromElsewhere: 'YES',
          moneyFromElsewhereDetails: 'family support',
          // Non-finance fields should remain
          dependantChildren: 'YES',
          dependantChildrenDetails: 'two children',
        },
      },
    };

    normaliseHouseholdFinance(response);

    expect(response.defendantResponses?.householdCircumstances).toEqual({
      shareIncomeExpenseDetails: 'NO',
      dependantChildren: 'YES',
      dependantChildrenDetails: 'two children',
    });
  });

  it('drops regular expense fields when shareIncomeExpenseDetails is NO', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: {
        householdCircumstances: {
          shareIncomeExpenseDetails: 'NO',
          householdBills: { applies: 'YES', amount: '5000', frequency: 'MONTHLY' },
          loanPayments: { applies: 'YES', amount: '2000', frequency: 'WEEKLY' },
          childSpousalMaintenance: { applies: 'YES', amount: '1500', frequency: 'MONTHLY' },
          mobilePhone: { applies: 'YES', amount: '2500', frequency: 'MONTHLY' },
          groceryShopping: { applies: 'YES', amount: '8000', frequency: 'MONTHLY' },
          fuelParkingTransport: { applies: 'YES', amount: '3000', frequency: 'MONTHLY' },
          schoolCosts: { applies: 'YES', amount: '4000', frequency: 'MONTHLY' },
          clothing: { applies: 'YES', amount: '2000', frequency: 'MONTHLY' },
          otherExpenses: { applies: 'YES', amount: '1000', frequency: 'WEEKLY' },
          dependantChildren: 'YES',
        },
      },
    };

    normaliseHouseholdFinance(response);

    expect(response.defendantResponses?.householdCircumstances).toEqual({
      shareIncomeExpenseDetails: 'NO',
      dependantChildren: 'YES',
    });
  });

  it('drops the finance branch when shareIncomeExpenseDetails is undefined', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: {
        householdCircumstances: {
          incomeFromJobs: 'YES',
          incomeFromJobsAmount: '5000',
        },
      },
    };

    normaliseHouseholdFinance(response);

    expect(response.defendantResponses?.householdCircumstances).toEqual({});
  });

  it('drops ucApplicationDate when universalCredit is NO but keeps the rest of the finance branch', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: {
        householdCircumstances: {
          shareIncomeExpenseDetails: 'YES',
          incomeFromJobs: 'YES',
          incomeFromJobsAmount: '5000',
          universalCredit: 'NO',
          ucApplicationDate: '2024-01-01',
        },
      },
    };

    normaliseHouseholdFinance(response);

    expect(response.defendantResponses?.householdCircumstances).toEqual({
      shareIncomeExpenseDetails: 'YES',
      incomeFromJobs: 'YES',
      incomeFromJobsAmount: '5000',
      universalCredit: 'NO',
    });
  });

  it('keeps the full finance branch when shareIncomeExpenseDetails is YES and universalCredit is YES', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: {
        householdCircumstances: {
          shareIncomeExpenseDetails: 'YES',
          universalCredit: 'YES',
          universalCreditAmount: '1000',
          ucApplicationDate: '2024-01-01',
        },
      },
    };

    normaliseHouseholdFinance(response);

    expect(response.defendantResponses?.householdCircumstances).toEqual({
      shareIncomeExpenseDetails: 'YES',
      universalCredit: 'YES',
      universalCreditAmount: '1000',
      ucApplicationDate: '2024-01-01',
    });
  });

  it('is a no-op on empty response', () => {
    const response = {} as PossessionClaimResponse;
    normaliseHouseholdFinance(response);
    expect(response).toEqual({});
  });

  it('is a no-op when householdCircumstances is absent', () => {
    const response: PossessionClaimResponse = { defendantResponses: {} };
    normaliseHouseholdFinance(response);
    expect(response).toEqual({ defendantResponses: {} });
  });

  it('is idempotent — calling twice gives same result as once', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: {
        householdCircumstances: {
          shareIncomeExpenseDetails: 'NO',
          incomeFromJobs: 'YES',
          incomeFromJobsAmount: '5000',
        },
      },
    };

    normaliseHouseholdFinance(response);
    const afterOnce = JSON.stringify(response);
    normaliseHouseholdFinance(response);
    expect(JSON.stringify(response)).toBe(afterOnce);
  });
});
