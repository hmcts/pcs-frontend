import type { Request } from 'express';

import { flowConfig } from '../../../../main/steps/respond-to-claim/flow.config';
import {
  hasConfirmedInstallmentOffer,
  hasProvidedFinanceDetails,
  shouldShowInstallmentPaymentsStep,
  shouldShowUniversalCreditStep,
} from '../../../../main/steps/respond-to-claim/flowConditions';

import { getNextStep, getPreviousStep } from '@modules/steps/flow';

describe('respond-to-claim navigation from CCD case data', () => {
  const createReq = (validatedCase: Record<string, unknown>): Request => {
    const includesNestedData =
      'data' in validatedCase &&
      typeof validatedCase['data'] === 'object' &&
      validatedCase['data'] !== null &&
      !Array.isArray(validatedCase['data']);

    const normalizedValidatedCase = includesNestedData ? validatedCase : { ...validatedCase, data: validatedCase };

    return {
      res: {
        locals: {
          validatedCase: normalizedValidatedCase,
        },
      },
    } as unknown as Request;
  };

  it('routes contact preferences telephone step from validated case data', async () => {
    const optedInReq = createReq({ isDefendantContactByPhone: true });
    const optedOutReq = createReq({ isDefendantContactByPhone: false });

    await expect(getNextStep(optedInReq, 'contact-preferences-telephone', flowConfig, {})).resolves.toBe(
      'contact-preferences-text-message'
    );
    await expect(getNextStep(optedOutReq, 'contact-preferences-telephone', flowConfig, {})).resolves.toBe(
      'dispute-claim-interstitial'
    );
  });

  it('routes confirmation of notice step from validated case data', async () => {
    const noticeDateProvidedReq = createReq({
      noticeDate: '2026-01-15',
      noticeServed: 'YES',
      defendantResponsesPossessionNoticeReceived: 'yes',
    });
    const rentArrearsReq = createReq({
      noticeServed: 'YES',
      defendantResponsesPossessionNoticeReceived: 'imNotSure',
      data: {
        claimGroundSummaries: [{ value: { isRentArrears: 'YES' } }],
      },
    });

    await expect(getNextStep(noticeDateProvidedReq, 'confirmation-of-notice-given', flowConfig, {})).resolves.toBe(
      'confirmation-of-notice-date-when-provided'
    );
    await expect(getNextStep(rentArrearsReq, 'confirmation-of-notice-given', flowConfig, {})).resolves.toBe(
      'rent-arrears-dispute'
    );
  });

  it('routes unexpected possessionNoticeReceived values to arrears branches (not notice-date pages)', async () => {
    const unexpectedValueReq = createReq({
      noticeDate: '2026-01-15',
      noticeServed: 'YES',
      defendantResponsesPossessionNoticeReceived: 'NOT SURE',
      data: {
        claimGroundSummaries: [{ value: { isRentArrears: 'NO' } }],
      },
    });

    await expect(getNextStep(unexpectedValueReq, 'confirmation-of-notice-given', flowConfig, {})).resolves.toBe(
      'non-rent-arrears-dispute'
    );
  });

  it('derives tenancy type back navigation from validated case data only', async () => {
    const welshReq = createReq({ legislativeCountry: 'Wales' });
    const englishReq = createReq({ legislativeCountry: 'England' });

    await expect(getPreviousStep(welshReq, 'tenancy-type-details', flowConfig, {})).resolves.toBe('written-terms');
    await expect(getPreviousStep(englishReq, 'tenancy-type-details', flowConfig, {})).resolves.toBe(
      'dispute-claim-interstitial'
    );
  });

  it('derives date-of-birth back navigation from CCD defendant name-known state', async () => {
    const nameKnownReq = createReq({ claimantEnteredDefendantDetailsNameKnown: 'YES' });
    const nameUnknownReq = createReq({ claimantEnteredDefendantDetailsNameKnown: 'NO' });

    await expect(getPreviousStep(nameKnownReq, 'defendant-date-of-birth', flowConfig, {})).resolves.toBe(
      'defendant-name-confirmation'
    );
    await expect(getPreviousStep(nameUnknownReq, 'defendant-date-of-birth', flowConfig, {})).resolves.toBe(
      'defendant-name-capture'
    );
  });

  const rentArrearsData = {
    claimGroundSummaries: [{ value: { isRentArrears: 'YES' } }],
  };

  it('uses valid static previous step for household interstitial path', async () => {
    const req = createReq({});
    await expect(getPreviousStep(req, 'your-household-and-circumstances', flowConfig, {})).resolves.toBe(
      'counter-claim'
    );
  });

  it('routes counter-claim NO to household interstitial for non-rent-arrears-only claims', async () => {
    const req = createReq({
      data: {
        claimGroundSummaries: [{ value: { isRentArrears: 'NO' } }],
      },
    });

    await expect(getNextStep(req, 'counter-claim', flowConfig, {}, { makeCounterClaim: 'NO' })).resolves.toBe(
      'your-household-and-circumstances'
    );
  });

  it('routes counter-claim NO to payment interstitial for rent-arrears claims', async () => {
    const req = createReq({
      data: {
        claimGroundSummaries: [{ value: { isRentArrears: 'YES' } }, { value: { isRentArrears: 'NO' } }],
      },
    });

    await expect(getNextStep(req, 'counter-claim', flowConfig, {}, { makeCounterClaim: 'NO' })).resolves.toBe(
      'payment-interstitial'
    );
  });

  it('routes counter-claim YES to what-are-you-claiming-for', async () => {
    const req = createReq({
      data: {
        claimGroundSummaries: [{ value: { isRentArrears: 'NO' } }],
        possessionClaimResponse: {
          defendantResponses: {
            makeCounterClaim: 'YES',
          },
        },
      },
    });

    await expect(getNextStep(req, 'counter-claim', flowConfig, {})).resolves.toBe('what-are-you-claiming-for');
  });

  const noRentArrearsData = {
    claimGroundSummaries: [{ value: { isRentArrears: 'NO' } }],
  };

  it('routes repayments-agreed forward from CCD state', async () => {
    const rentArrearsReq = createReq({
      data: {
        ...rentArrearsData,
        possessionClaimResponse: {
          defendantResponses: {
            paymentAgreement: { repaymentPlanAgreed: 'NO' },
          },
        },
      },
    });
    const noArrearsReq = createReq({
      data: {
        ...noRentArrearsData,
        possessionClaimResponse: {
          defendantResponses: {
            paymentAgreement: { repaymentPlanAgreed: 'NO' },
          },
        },
      },
    });

    await expect(getNextStep(rentArrearsReq, 'repayments-agreed', flowConfig, {})).resolves.toBe(
      'installment-payments'
    );

    await expect(getNextStep(noArrearsReq, 'repayments-agreed', flowConfig, {})).resolves.toBe(
      'your-household-and-circumstances'
    );
  });

  it('routes installment-payments forward from CCD state', async () => {
    const req = createReq({
      data: {
        possessionClaimResponse: {
          defendantResponses: {
            paymentAgreement: { repayArrearsInstalments: 'YES' },
          },
        },
      },
    });

    await expect(getNextStep(req, 'installment-payments', flowConfig, {})).resolves.toBe('how-much-afford-to-pay');

    await expect(getNextStep(createReq({}), 'installment-payments', flowConfig, {})).resolves.toBe(
      'your-household-and-circumstances'
    );
  });

  it('routes installment-payments forward when repayArrearsInstalments is stored at possessionClaimResponse.paymentAgreement', async () => {
    const req = createReq({
      data: {
        possessionClaimResponse: {
          paymentAgreement: { repayArrearsInstalments: 'YES' },
        },
      },
    });

    await expect(getNextStep(req, 'installment-payments', flowConfig, {})).resolves.toBe('how-much-afford-to-pay');
  });

  it('routes installment-payments forward from the submitted answer before CCD state is refreshed', async () => {
    const req = createReq({});
    req.body = { confirmInstallmentOffer: 'yes' };

    await expect(getNextStep(req, 'installment-payments', flowConfig, {}, req.body)).resolves.toBe(
      'how-much-afford-to-pay'
    );
  });

  it('show helpers are derived from CCD (GET / deep link)', async () => {
    const installmentVisibleReq = createReq({
      data: {
        ...rentArrearsData,
        possessionClaimResponse: {
          defendantResponses: {
            paymentAgreement: { repaymentPlanAgreed: 'NO' },
          },
        },
      },
    });
    const installmentHiddenReq = createReq({
      data: {
        ...rentArrearsData,
        possessionClaimResponse: {
          defendantResponses: {
            paymentAgreement: { repaymentPlanAgreed: 'YES' },
          },
        },
      },
    });

    expect(shouldShowInstallmentPaymentsStep(installmentVisibleReq)).toBe(true);
    expect(shouldShowInstallmentPaymentsStep(installmentHiddenReq)).toBe(false);

    const howMuchReq = createReq({
      data: {
        possessionClaimResponse: {
          defendantResponses: {
            paymentAgreement: { repayArrearsInstalments: 'YES' },
          },
        },
      },
    });

    expect(hasConfirmedInstallmentOffer(howMuchReq)).toBe(true);
    const howMuchTopLevelReq = createReq({
      data: {
        possessionClaimResponse: {
          paymentAgreement: { repayArrearsInstalments: 'YES' },
        },
      },
    });
    expect(hasConfirmedInstallmentOffer(howMuchTopLevelReq)).toBe(true);
    const howMuchSubmittedAnswerReq = createReq({});
    howMuchSubmittedAnswerReq.body = { confirmInstallmentOffer: 'yes' };
    expect(hasConfirmedInstallmentOffer(howMuchSubmittedAnswerReq)).toBe(true);
    expect(hasConfirmedInstallmentOffer(createReq({}))).toBe(false);
    const financeProvidedReq = createReq({
      data: {
        possessionClaimResponse: {
          defendantResponses: {
            householdCircumstances: {
              shareIncomeExpenseDetails: 'YES',
            },
          },
        },
      },
    });
    const financeNotProvidedReq = createReq({
      data: {
        possessionClaimResponse: {
          defendantResponses: {
            householdCircumstances: {
              shareIncomeExpenseDetails: 'NO',
            },
          },
        },
      },
    });

    expect(hasProvidedFinanceDetails(financeProvidedReq)).toBe(true);
    expect(hasProvidedFinanceDetails(financeNotProvidedReq)).toBe(false);

    const universalCreditSelectedReq = createReq({
      data: {
        possessionClaimResponse: {
          defendantResponses: {
            householdCircumstances: {
              shareIncomeExpenseDetails: 'YES',
              universalCredit: 'YES',
            },
          },
        },
      },
    });
    const universalCreditNotSelectedReq = createReq({
      data: {
        possessionClaimResponse: {
          defendantResponses: {
            householdCircumstances: {
              shareIncomeExpenseDetails: 'YES',
              universalCredit: 'NO',
            },
          },
        },
      },
    });

    expect(shouldShowUniversalCreditStep(universalCreditSelectedReq)).toBe(false);
    expect(shouldShowUniversalCreditStep(universalCreditNotSelectedReq)).toBe(true);
  });

  it('routes income-and-expenses no answer directly to other-considerations', async () => {
    const req = createReq({});
    req.body = { provideFinanceDetails: 'no' };

    await expect(getNextStep(req, 'income-and-expenses', flowConfig, {})).resolves.toBe('other-considerations');
  });

  it('routes income-and-expenses yes answer into finance journey', async () => {
    const req = createReq({});
    req.body = { provideFinanceDetails: 'yes' };

    await expect(getNextStep(req, 'income-and-expenses', flowConfig, {})).resolves.toBe(
      'what-regular-income-do-you-receive'
    );
  });

  it('routes regular-income to priority-debts when universal credit is selected', async () => {
    const req = createReq({
      data: {
        possessionClaimResponse: {
          defendantResponses: {
            householdCircumstances: {
              shareIncomeExpenseDetails: 'YES',
            },
          },
        },
      },
    });
    req.body = { regularIncome: ['universalCredit'] };

    await expect(getNextStep(req, 'what-regular-income-do-you-receive', flowConfig, {})).resolves.toBe(
      'priority-debts'
    );
  });

  it('routes regular-income to universal-credit when universal credit is not selected', async () => {
    const req = createReq({
      data: {
        possessionClaimResponse: {
          defendantResponses: {
            householdCircumstances: {
              shareIncomeExpenseDetails: 'YES',
            },
          },
        },
      },
    });
    req.body = { regularIncome: ['incomeFromJobs'] };

    await expect(getNextStep(req, 'what-regular-income-do-you-receive', flowConfig, {})).resolves.toBe(
      'have-you-applied-for-universal-credit'
    );
  });
});
