import type { Request } from 'express';

import { flowConfig } from '../../../../main/steps/respond-to-claim/flow.config';

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
      defendantResponsesConfirmNoticeGiven: 'yes',
      noticeDate: '2026-01-15',
      noticeServed: 'YES',
      claimGroundSummaries: [{ value: { isRentArrears: 'YES' } }],
    });

    await expect(
      getNextStep(req, 'confirmation-of-notice-given', flowConfig, {}, { confirmNoticeGiven: 'imNotSure' })
    ).resolves.toBe('rent-arrears-dispute');
  });

  it('routes confirmation of notice step from validated case data when current step answer is unavailable', async () => {
    const noticeDateProvidedReq = createReq({
      defendantResponsesConfirmNoticeGiven: 'yes',
      noticeDate: '2026-01-15',
      noticeServed: 'YES',
    });
    const rentArrearsReq = createReq({
      defendantResponsesConfirmNoticeGiven: 'imNotSure',
      noticeServed: 'YES',
      claimGroundSummaries: [{ value: { isRentArrears: 'YES' } }],
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
      defendantResponsesConfirmNoticeGiven: 'NOT SURE',
      noticeDate: '2026-01-15',
      noticeServed: 'YES',
      claimGroundSummaries: [{ value: { isRentArrears: 'NO' } }],
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
});
