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

  it('derives tenancy type back navigation from validated case data only', async () => {
    const welshReq = createReq({ legislativeCountry: 'Wales' });
    const englishReq = createReq({ legislativeCountry: 'England' });

    await expect(getPreviousStep(welshReq, 'tenancy-type-details', flowConfig, {})).resolves.toBe(
      'landlord-registered'
    );
    await expect(getPreviousStep(englishReq, 'tenancy-type-details', flowConfig, {})).resolves.toBe(
      'dispute-claim-interstitial'
    );
  });
});
