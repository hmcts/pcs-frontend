import type { Request } from 'express';

import { flowConfig } from '../../../../main/steps/respond-to-claim/flow.config';
import {
  hasConfirmedInstallmentOffer,
  shouldShowInstallmentPaymentsStep,
} from '../../../../main/steps/respond-to-claim/flowConditions';

import { getNextStep, getPreviousStep } from '@modules/steps/flow';

describe('respond-to-claim navigation from CCD case data', () => {
  const createReq = (validatedCase: Record<string, unknown>): Request =>
    ({
      res: {
        locals: {
          validatedCase,
        },
      },
    }) as unknown as Request;

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
      data: {
        possessionClaimResponse: {
          defendantResponses: {
            possessionNoticeReceived: 'YES',
          },
        },
      },
    });
    const rentArrearsReq = createReq({
      noticeServed: 'YES',
      data: {
        possessionClaimResponse: {
          defendantResponses: {
            possessionNoticeReceived: 'NOT_SURE',
          },
        },
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

  it('routes unexpected confirmNoticeGiven values to arrears branches (not notice-date pages)', async () => {
    const unexpectedValueReq = createReq({
      noticeDate: '2026-01-15',
      noticeServed: 'YES',
      data: {
        possessionClaimResponse: {
          defendantResponses: {
            possessionNoticeReceived: 'NOT SURE',
          },
        },
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

  it('uses valid static previous step for household interstitial path', async () => {
    const req = createReq({});
    await expect(getPreviousStep(req, 'your-household-and-circumstances', flowConfig, {})).resolves.toBe(
      'repayments-agreed'
    );
  });

  const rentArrearsData = {
    claimGroundSummaries: [{ value: { isRentArrears: 'YES' } }],
  };

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
    expect(hasConfirmedInstallmentOffer(createReq({}))).toBe(false);
  });
});
