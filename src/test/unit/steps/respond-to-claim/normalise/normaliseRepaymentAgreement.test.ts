import type { PossessionClaimResponse } from '../../../../../main/services/ccdCase.interface';
import { normaliseRepaymentAgreement } from '../../../../../main/steps/respond-to-claim/normalise/normaliseRepaymentAgreement';

describe('normaliseRepaymentAgreement', () => {
  it('drops the instalment chain when repaymentPlanAgreed is YES', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: {
        paymentAgreement: {
          repaymentPlanAgreed: 'YES',
          repayArrearsInstalments: 'YES',
          additionalRentContribution: '10000',
          additionalContributionFrequency: 'WEEKLY',
        },
      },
    };

    normaliseRepaymentAgreement(response);

    expect(response.defendantResponses?.paymentAgreement).toEqual({
      repaymentPlanAgreed: 'YES',
    });
  });

  it('drops the instalment chain when repaymentPlanAgreed is NOT_SURE', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: {
        paymentAgreement: {
          repaymentPlanAgreed: 'NOT_SURE',
          repayArrearsInstalments: 'YES',
          additionalRentContribution: '10000',
          additionalContributionFrequency: 'WEEKLY',
        },
      },
    };

    normaliseRepaymentAgreement(response);

    expect(response.defendantResponses?.paymentAgreement).toEqual({
      repaymentPlanAgreed: 'NOT_SURE',
    });
  });

  it('drops contribution details when repayArrearsInstalments is NO', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: {
        paymentAgreement: {
          repaymentPlanAgreed: 'NO',
          repayArrearsInstalments: 'NO',
          additionalRentContribution: '10000',
          additionalContributionFrequency: 'WEEKLY',
        },
      },
    };

    normaliseRepaymentAgreement(response);

    expect(response.defendantResponses?.paymentAgreement).toEqual({
      repaymentPlanAgreed: 'NO',
      repayArrearsInstalments: 'NO',
    });
  });

  it('keeps the full chain when repaymentPlanAgreed is NO and repayArrearsInstalments is YES', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: {
        paymentAgreement: {
          repaymentPlanAgreed: 'NO',
          repayArrearsInstalments: 'YES',
          additionalRentContribution: '10000',
          additionalContributionFrequency: 'WEEKLY',
        },
      },
    };

    normaliseRepaymentAgreement(response);

    expect(response.defendantResponses?.paymentAgreement).toEqual({
      repaymentPlanAgreed: 'NO',
      repayArrearsInstalments: 'YES',
      additionalRentContribution: '10000',
      additionalContributionFrequency: 'WEEKLY',
    });
  });

  it('is a no-op on empty response', () => {
    const response = {} as PossessionClaimResponse;
    normaliseRepaymentAgreement(response);
    expect(response).toEqual({});
  });

  it('is a no-op when paymentAgreement is absent', () => {
    const response: PossessionClaimResponse = { defendantResponses: {} };
    normaliseRepaymentAgreement(response);
    expect(response).toEqual({ defendantResponses: {} });
  });

  it('is idempotent — calling twice gives same result as once', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: {
        paymentAgreement: {
          repaymentPlanAgreed: 'YES',
          repayArrearsInstalments: 'YES',
          additionalRentContribution: '10000',
        },
      },
    };

    normaliseRepaymentAgreement(response);
    const afterOnce = JSON.stringify(response);
    normaliseRepaymentAgreement(response);
    expect(JSON.stringify(response)).toBe(afterOnce);
  });

  // CCD echoes YesOrNo PascalCase since pcs-api PR #1678 — keep the contribution chain
  // when repaymentPlanAgreed comes back as "No" and repayArrearsInstalments as "Yes".
  it('treats PascalCase "No"/"Yes" the same as "NO"/"YES"', () => {
    const response = {
      defendantResponses: {
        paymentAgreement: {
          // Casts simulate BE returning out-of-type casing.
          repaymentPlanAgreed: 'No' as 'NO',
          repayArrearsInstalments: 'Yes' as 'YES',
          additionalRentContribution: '10000',
          additionalContributionFrequency: 'WEEKLY',
        },
      },
    } as PossessionClaimResponse;

    normaliseRepaymentAgreement(response);

    expect(response.defendantResponses?.paymentAgreement).toMatchObject({
      additionalRentContribution: '10000',
      additionalContributionFrequency: 'WEEKLY',
    });
  });
});
