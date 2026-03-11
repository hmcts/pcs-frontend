import { isNoticeDateProvided } from '../../../../main/steps/utils/isNoticeDateProvided';
import { isNoticeServed } from '../../../../main/steps/utils/isNoticeServed';
import { getPreviousPageForArrears } from '../../../../main/steps/utils/journeyHelpers';

jest.mock('../../../../main/steps/utils/isNoticeDateProvided');
jest.mock('../../../../main/steps/utils/isNoticeServed');

describe('getPreviousPageForArrears', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockReq: any;

  beforeEach(() => {
    mockReq = {
      session: { formData: {} },
      res: { locals: {} },
    };
    jest.clearAllMocks();
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

    it('returns confirmation-of-notice-given when user said imNotSure, notice served, even if date was provided', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(true);
      mockReq.res.locals.validatedCase = { defendantResponsesConfirmNoticeGiven: 'imNotSure' };

      expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-given');
    });
  });

  describe('Notice date was provided in CCD', () => {
    it('returns confirmation-of-notice-date-when-provided when date provided and notice served', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(true);
      expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-date-when-provided');
    });

    it('returns confirmation-of-notice-date-when-provided when date provided, notice served, no user answer', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(true);

      expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-date-when-provided');
    });

    it('returns confirmation-of-notice-date-when-provided when date provided, notice served, confirmNoticeGiven undefined', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(true);

      expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-date-when-provided');
    });
  });

  describe('Notice date was NOT provided in CCD', () => {
    it('returns confirmation-of-notice-date-when-not-provided when date not provided, notice served, user confirmed yes', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);

      expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-date-when-not-provided');
    });

    it('returns confirmation-of-notice-date-when-not-provided when date not provided, notice served, no user answer', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);

      expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-date-when-not-provided');
    });

    it('returns confirmation-of-notice-date-when-not-provided when date not provided, notice served, confirmNoticeGiven undefined', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);

      expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-date-when-not-provided');
    });
  });

  describe('No notice served (default fallback)', () => {
    it('returns tenancy-details when notice not served', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(false);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);

      expect(await getPreviousPageForArrears(mockReq)).toBe('tenancy-details');
    });

    it('returns tenancy-details when notice not served, even if date provided', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(false);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(true); // Date provided but notice not served

      expect(await getPreviousPageForArrears(mockReq)).toBe('tenancy-details');
    });

    it('returns tenancy-details when notice not served, user said no', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(false);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);

      expect(await getPreviousPageForArrears(mockReq)).toBe('tenancy-details');
    });
  });

  describe('Integration with real routing scenarios', () => {
    it('handles rent arrears scenario with notice and date', async () => {
      // Real scenario: User on rent-arrears-dispute, clicks back
      // CCD has notice=Yes, date=2022-01-01, user confirmed yes
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(true);

      expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-date-when-provided');
    });

    it('handles non-rent arrears scenario without notice date', async () => {
      // Real scenario: User on non-rent-arrears-dispute, clicks back
      // CCD has notice=Yes, NO date, user confirmed yes
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);

      expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-date-when-not-provided');
    });

    it('handles no notice served scenario', async () => {
      // Real scenario: CCD has notice=No, goes straight to rent-arrears-dispute from tenancy-details
      (isNoticeServed as jest.Mock).mockResolvedValue(false);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);

      expect(await getPreviousPageForArrears(mockReq)).toBe('tenancy-details');
    });

    it('handles user rejection scenario (CCD-backed)', async () => {
      // User rejected notice on confirmation-of-notice-given, went to rent-arrears-dispute, clicks back
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(true);
      mockReq.res.locals.validatedCase = { defendantResponsesConfirmNoticeGiven: 'no' };

      expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-given');
    });
  });
});
