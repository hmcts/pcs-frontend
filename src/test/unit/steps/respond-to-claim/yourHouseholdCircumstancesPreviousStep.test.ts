import type { Request } from 'express';

import { getPreviousStepForYourHouseholdAndCircumstances } from '../../../../main/steps/utils/getPreviousStepForYourHouseholdAndCircumstances';
import { isRentArrearsClaim } from '../../../../main/steps/utils/isRentArrearsClaim';

jest.mock('../../../../main/steps/utils/isRentArrearsClaim', () => ({
  ...jest.requireActual('../../../../main/steps/utils/isRentArrearsClaim'),
  isRentArrearsClaim: jest.fn(),
}));

function makeReq(paymentAgreement: Record<string, unknown> | undefined): Request {
  return {
    res: {
      locals: {
        validatedCase: {
          data: {
            possessionClaimResponse: {
              defendantResponses: paymentAgreement ? { paymentAgreement } : {},
            },
          },
        },
      },
    },
  } as unknown as Request;
}

function makeReqFlatPaymentAgreement(paymentAgreement: Record<string, unknown>): Request {
  return {
    res: {
      locals: {
        validatedCase: {
          data: {
            possessionClaimResponse: {
              paymentAgreement,
            },
          },
        },
      },
    },
  } as unknown as Request;
}

describe('getPreviousStepForYourHouseholdAndCircumstances', () => {
  beforeEach(() => {
    jest.mocked(isRentArrearsClaim).mockResolvedValue(true);
  });

  it('returns repayments-agreed when repaymentPlanAgreed is absent', async () => {
    const req = makeReq({ repayArrearsInstalments: 'NO' });
    await expect(getPreviousStepForYourHouseholdAndCircumstances(req)).resolves.toBe('repayments-agreed');
  });

  it('returns repayments-agreed when repaymentPlanAgreed is not NO', async () => {
    const req = makeReq({ repaymentPlanAgreed: 'YES' });
    await expect(getPreviousStepForYourHouseholdAndCircumstances(req)).resolves.toBe('repayments-agreed');
  });

  it('returns repayments-agreed when not a rent arrears claim', async () => {
    jest.mocked(isRentArrearsClaim).mockResolvedValue(false);
    const req = makeReq({ repaymentPlanAgreed: 'NO' });
    await expect(getPreviousStepForYourHouseholdAndCircumstances(req)).resolves.toBe('repayments-agreed');
  });

  it('returns installment-payments when NO plan agreed, arrears, and instalment offer declined', async () => {
    const req = makeReq({ repaymentPlanAgreed: 'NO', repayArrearsInstalments: 'NO' });
    await expect(getPreviousStepForYourHouseholdAndCircumstances(req)).resolves.toBe('installment-payments');
  });

  it('returns how-much-afford-to-pay when instalments accepted and amount present in CCD', async () => {
    const req = makeReq({
      repaymentPlanAgreed: 'NO',
      repayArrearsInstalments: 'YES',
      additionalRentContribution: { amount: 1000 },
    });
    await expect(getPreviousStepForYourHouseholdAndCircumstances(req)).resolves.toBe('how-much-afford-to-pay');
  });

  it('returns how-much-afford-to-pay when MoneyGBP is a pence string on nested payment agreement', async () => {
    const req = makeReq({
      repaymentPlanAgreed: 'NO',
      repayArrearsInstalments: 'YES',
      additionalRentContribution: '1000',
    });
    await expect(getPreviousStepForYourHouseholdAndCircumstances(req)).resolves.toBe('how-much-afford-to-pay');
  });

  it('uses flat possessionClaimResponse.paymentAgreement when nested is absent', async () => {
    const req = makeReqFlatPaymentAgreement({
      repaymentPlanAgreed: 'NO',
      repayArrearsInstalments: 'YES',
      additionalRentContribution: '5000',
    });
    await expect(getPreviousStepForYourHouseholdAndCircumstances(req)).resolves.toBe('how-much-afford-to-pay');
  });

  it('returns installment-payments when instalments accepted but amount not yet in CCD', async () => {
    const req = makeReq({
      repaymentPlanAgreed: 'NO',
      repayArrearsInstalments: 'YES',
    });
    await expect(getPreviousStepForYourHouseholdAndCircumstances(req)).resolves.toBe('installment-payments');
  });
});
