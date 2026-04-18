import type { Request } from 'express';

import { flowConfig } from '../../../../main/steps/respond-to-claim/flow.config';
import {
  shouldShowHowMuchAffordToPayStep,
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

  it('routes contact preferences telephone step from current step answer when provided', async () => {
    const req = createReq({ isDefendantContactByPhone: false });

    await expect(
      getNextStep(req, 'contact-preferences-telephone', flowConfig, {}, { contactByTelephone: 'yes' })
    ).resolves.toBe('contact-preferences-text-message');
    await expect(
      getNextStep(req, 'contact-preferences-telephone', flowConfig, {}, { contactByTelephone: 'no' })
    ).resolves.toBe('dispute-claim-interstitial');
  });

  it('falls back to validated case data when current step answer is unavailable', async () => {
    const optedInReq = createReq({ isDefendantContactByPhone: true });
    const optedOutReq = createReq({ isDefendantContactByPhone: false });

    await expect(getNextStep(optedInReq, 'contact-preferences-telephone', flowConfig, {})).resolves.toBe(
      'contact-preferences-text-message'
    );
    await expect(getNextStep(optedOutReq, 'contact-preferences-telephone', flowConfig, {})).resolves.toBe(
      'dispute-claim-interstitial'
    );
  });

  it('routes confirmation of notice step from current step answer when provided', async () => {
    const req = createReq({
      noticeDate: '2026-01-15',
      noticeServed: 'YES',
      data: {
        claimGroundSummaries: [{ value: { isRentArrears: 'YES' } }],
      },
    });

    await expect(
      getNextStep(req, 'confirmation-of-notice-given', flowConfig, {}, { possessionNoticeReceived: 'NOT_SURE' })
    ).resolves.toBe('rent-arrears-dispute');
  });

  it('routes confirmation of notice step from validated case data when current step answer is unavailable', async () => {
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

  it('routes repayments-agreed forward like legacy routes (installment path only when no + rent arrears)', async () => {
    const rentArrearsReq = createReq({ data: rentArrearsData });
    const noArrearsReq = createReq({ data: noRentArrearsData });

    await expect(
      getNextStep(rentArrearsReq, 'repayments-agreed', flowConfig, {}, { repaymentsAgreed: 'no' })
    ).resolves.toBe('installment-payments');

    await expect(
      getNextStep(noArrearsReq, 'repayments-agreed', flowConfig, {}, { repaymentsAgreed: 'no' })
    ).resolves.toBe('your-household-and-circumstances');

    await expect(
      getNextStep(rentArrearsReq, 'repayments-agreed', flowConfig, {}, { repaymentsAgreed: 'yes' })
    ).resolves.toBe('your-household-and-circumstances');
  });

  it('routes installment-payments forward like legacy routes (how-much only when offer is yes)', async () => {
    const req = createReq({});

    await expect(
      getNextStep(req, 'installment-payments', flowConfig, {}, { confirmInstallmentOffer: 'yes' })
    ).resolves.toBe('how-much-afford-to-pay');

    await expect(
      getNextStep(req, 'installment-payments', flowConfig, {}, { confirmInstallmentOffer: 'no' })
    ).resolves.toBe('your-household-and-circumstances');
  });

  it('show helpers fall back to CCD when current-step answers are absent (GET / deep link)', async () => {
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

    await expect(shouldShowInstallmentPaymentsStep(installmentVisibleReq, {})).resolves.toBe(true);
    await expect(shouldShowInstallmentPaymentsStep(installmentHiddenReq, {})).resolves.toBe(false);

    const howMuchReq = createReq({
      data: {
        possessionClaimResponse: {
          defendantResponses: {
            paymentAgreement: { repayArrearsInstalments: 'YES' },
          },
        },
      },
    });

    expect(shouldShowHowMuchAffordToPayStep(howMuchReq, {})).toBe(true);
    expect(shouldShowHowMuchAffordToPayStep(createReq({}), {})).toBe(false);
  });
});
