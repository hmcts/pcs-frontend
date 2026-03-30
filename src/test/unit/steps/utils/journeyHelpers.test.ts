import { isNoticeDateProvided } from '../../../../main/steps/utils/isNoticeDateProvided';
import { isNoticeServed } from '../../../../main/steps/utils/isNoticeServed';
import { isTenancyStartDateKnown } from '../../../../main/steps/utils/isTenancyStartDateKnown';
import { getPreviousPageForArrears } from '../../../../main/steps/utils/journeyHelpers';

jest.mock('../../../../main/steps/utils/isNoticeDateProvided');
jest.mock('../../../../main/steps/utils/isNoticeServed');
jest.mock('../../../../main/steps/utils/isTenancyStartDateKnown');

describe('getPreviousPageForArrears', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockReq: any;

  beforeEach(() => {
    mockReq = {
      res: { locals: {} },
    };
    jest.clearAllMocks();
    (isTenancyStartDateKnown as jest.Mock).mockResolvedValue(true);
  });

  describe('User rejected notice (CCD-backed confirmNoticeGiven)', () => {
    it('returns confirmation-of-notice-given when user said no and notice served', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);
      mockReq.res.locals.validatedCase = { defendantResponsesConfirmNoticeGiven: 'no' };

      expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-given');
    });

    it('returns confirmation-of-notice-given when user said imNotSure and notice served', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);
      mockReq.res.locals.validatedCase = { defendantResponsesConfirmNoticeGiven: 'imNotSure' };

      expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-given');
    });

    it('returns confirmation-of-notice-given when user said no, notice served, even if date was provided', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(true);
      mockReq.res.locals.validatedCase = { defendantResponsesConfirmNoticeGiven: 'no' };

      expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-given');
    });
  });

  describe('Notice date was provided in CCD', () => {
    it('returns confirmation-of-notice-date-when-provided when date provided and notice served', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(true);

      expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-date-when-provided');
    });
  });

  describe('Notice date was NOT provided in CCD', () => {
    it('returns confirmation-of-notice-date-when-not-provided when date not provided and notice served', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);

      expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-date-when-not-provided');
    });
  });

  describe('No notice served (fallback)', () => {
    it('returns tenancy-date-details when notice not served and tenancy start date is known', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(false);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);
      (isTenancyStartDateKnown as jest.Mock).mockResolvedValue(true);

      expect(await getPreviousPageForArrears(mockReq)).toBe('tenancy-date-details');
    });

    it('returns tenancy-date-unknown when notice not served and tenancy start date is unknown', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(false);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);
      (isTenancyStartDateKnown as jest.Mock).mockResolvedValue(false);

      expect(await getPreviousPageForArrears(mockReq)).toBe('tenancy-date-unknown');
    });

    it('returns tenancy-date-details when notice not served, even if date provided, and start date is known', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(false);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(true); // Date provided but notice not served
      (isTenancyStartDateKnown as jest.Mock).mockResolvedValue(true);

      expect(await getPreviousPageForArrears(mockReq)).toBe('tenancy-date-unknown');
    });

    it('returns tenancy-date-details when notice not served, user said no, and start date is known', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(false);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);
      (isTenancyStartDateKnown as jest.Mock).mockResolvedValue(true);
      mockReq.session.formData = { 'confirmation-of-notice-given': { confirmNoticeGiven: 'no' } };

      expect(await getPreviousPageForArrears(mockReq)).toBe('tenancy-date-details');
    });

    it('returns tenancy-date-details when notice not served, user said yes, and start date is known', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(false);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);
      (isTenancyStartDateKnown as jest.Mock).mockResolvedValue(true);
      mockReq.session.formData = { 'confirmation-of-notice-given': { confirmNoticeGiven: 'yes' } };

      expect(await getPreviousPageForArrears(mockReq)).toBe('tenancy-date-details');
    });
  });

  describe('Edge cases with missing validated case data', () => {
    it('returns correct page when validatedCase is undefined', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(true);
      mockReq.res.locals = {};

      expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-date-when-provided');
    });

    it('returns correct page when res is undefined', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(true);
      mockReq = {};
      (isTenancyStartDateKnown as jest.Mock).mockResolvedValue(true);

      expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-date-when-provided');
    });

    it('returns tenancy-date-unknown when session is undefined and notice not served and start date unknown', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(false);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);
      (isTenancyStartDateKnown as jest.Mock).mockResolvedValue(false);
      mockReq = {}; // No session

      expect(await getPreviousPageForArrears(mockReq)).toBe('tenancy-date-unknown');
    });
  });

  describe('Integration with real routing scenarios', () => {
    it('handles rent arrears scenario with notice and date', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(true);

      expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-date-when-provided');
    });

    it('handles non-rent arrears scenario without notice date', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);

      expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-date-when-not-provided');
    });

    it('handles user rejection scenario (CCD-backed)', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(true);
      mockReq.res.locals.validatedCase = { defendantResponsesConfirmNoticeGiven: 'no' };

      expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-given');
    });

    it('handles no notice served scenario with known tenancy start date', async () => {
      // Real scenario: CCD has notice=No, goes straight to rent-arrears-dispute from tenancy-date-details
      (isNoticeServed as jest.Mock).mockResolvedValue(false);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);
      (isTenancyStartDateKnown as jest.Mock).mockResolvedValue(true);

      expect(await getPreviousPageForArrears(mockReq)).toBe('tenancy-date-details');
    });
  });
});
