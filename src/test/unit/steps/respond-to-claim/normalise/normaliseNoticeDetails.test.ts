import type { PossessionClaimResponse } from '../../../../../main/services/ccdCase.interface';
import { normaliseNoticeDetails } from '../../../../../main/steps/respond-to-claim/normalise/normaliseNoticeDetails';

describe('normaliseNoticeDetails', () => {
  it('drops noticeReceivedDate when possessionNoticeReceived is NO', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: {
        possessionNoticeReceived: 'NO',
        noticeReceivedDate: '2024-01-15',
      },
    };

    normaliseNoticeDetails(response);

    expect(response.defendantResponses).toEqual({ possessionNoticeReceived: 'NO' });
  });

  it('drops noticeReceivedDate when possessionNoticeReceived is NOT_SURE', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: {
        possessionNoticeReceived: 'NOT_SURE',
        noticeReceivedDate: '2024-01-15',
      },
    };

    normaliseNoticeDetails(response);

    expect(response.defendantResponses).toEqual({ possessionNoticeReceived: 'NOT_SURE' });
  });

  it('drops noticeReceivedDate when possessionNoticeReceived is undefined', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: { noticeReceivedDate: '2024-01-15' },
    };

    normaliseNoticeDetails(response);

    expect(response.defendantResponses).toEqual({});
  });

  it('keeps noticeReceivedDate when possessionNoticeReceived is YES', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: {
        possessionNoticeReceived: 'YES',
        noticeReceivedDate: '2024-01-15',
      },
    };

    normaliseNoticeDetails(response);

    expect(response.defendantResponses).toEqual({
      possessionNoticeReceived: 'YES',
      noticeReceivedDate: '2024-01-15',
    });
  });

  it('is a no-op on empty response', () => {
    const response = {} as PossessionClaimResponse;
    normaliseNoticeDetails(response);
    expect(response).toEqual({});
  });

  it('is idempotent — calling twice gives same result as once', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: { possessionNoticeReceived: 'NO', noticeReceivedDate: '2024-01-15' },
    };

    normaliseNoticeDetails(response);
    const afterOnce = JSON.stringify(response);
    normaliseNoticeDetails(response);
    expect(JSON.stringify(response)).toBe(afterOnce);
  });
});
