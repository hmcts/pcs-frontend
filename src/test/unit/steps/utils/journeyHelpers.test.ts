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
    };
    jest.clearAllMocks();
  });

  describe('Priority 1: User rejected notice (confirmNoticeGiven = "no" or "imNotSure")', () => {
    it('returns confirmation-of-notice-given when user said no and notice served', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);
      mockReq.session.formData = { 'confirmation-of-notice-given': { confirmNoticeGiven: 'no' } };

      expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-given');
    });

    it('returns confirmation-of-notice-given when user said imNotSure and notice served', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);
      mockReq.session.formData = { 'confirmation-of-notice-given': { confirmNoticeGiven: 'imNotSure' } };

      expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-given');
    });

    it('returns confirmation-of-notice-given when user said no, notice served, even if date was provided', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(true); // Date provided, but user rejected
      mockReq.session.formData = { 'confirmation-of-notice-given': { confirmNoticeGiven: 'no' } };

      expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-given');
    });

    it('returns confirmation-of-notice-given when user said imNotSure, notice served, even if date was provided', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(true); // Date provided, but user rejected
      mockReq.session.formData = { 'confirmation-of-notice-given': { confirmNoticeGiven: 'imNotSure' } };

      expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-given');
    });
  });

  describe('Priority 2: Notice date was provided in CCD', () => {
    it('returns confirmation-of-notice-date-when-provided when date provided and notice served', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(true);
      mockReq.session.formData = { 'confirmation-of-notice-given': { confirmNoticeGiven: 'yes' } };

      expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-date-when-provided');
    });

    it('returns confirmation-of-notice-date-when-provided when date provided, notice served, no user answer', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(true);
      mockReq.session.formData = {}; // No confirmation answer

      expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-date-when-provided');
    });

    it('returns confirmation-of-notice-date-when-provided when date provided, notice served, confirmNoticeGiven undefined', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(true);
      mockReq.session.formData = { 'confirmation-of-notice-given': {} };

      expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-date-when-provided');
    });
  });

  describe('Priority 3: Notice date was NOT provided in CCD', () => {
    it('returns confirmation-of-notice-date-when-not-provided when date not provided, notice served, user confirmed yes', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);
      mockReq.session.formData = { 'confirmation-of-notice-given': { confirmNoticeGiven: 'yes' } };

      expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-date-when-not-provided');
    });

    it('returns confirmation-of-notice-date-when-not-provided when date not provided, notice served, no user answer', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);
      mockReq.session.formData = {}; // No confirmation answer

      expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-date-when-not-provided');
    });

    it('returns confirmation-of-notice-date-when-not-provided when date not provided, notice served, confirmNoticeGiven undefined', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);
      mockReq.session.formData = { 'confirmation-of-notice-given': {} };

      expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-date-when-not-provided');
    });
  });

  describe('Priority 4: No notice served (default fallback)', () => {
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
      mockReq.session.formData = { 'confirmation-of-notice-given': { confirmNoticeGiven: 'no' } };

      expect(await getPreviousPageForArrears(mockReq)).toBe('tenancy-details');
    });

    it('returns tenancy-details when notice not served, user said yes', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(false);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);
      mockReq.session.formData = { 'confirmation-of-notice-given': { confirmNoticeGiven: 'yes' } };

      expect(await getPreviousPageForArrears(mockReq)).toBe('tenancy-details');
    });
  });

  describe('Edge cases with missing session data', () => {
    it('returns correct page when session.formData is undefined', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(true);
      mockReq.session = {}; // No formData

      expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-date-when-provided');
    });

    it('returns correct page when session is undefined', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(true);
      mockReq = {}; // No session

      expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-date-when-provided');
    });

    it('returns tenancy-details when session is undefined and notice not served', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(false);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);
      mockReq = {}; // No session

      expect(await getPreviousPageForArrears(mockReq)).toBe('tenancy-details');
    });
  });

  describe('Integration with real routing scenarios', () => {
    it('handles rent arrears scenario with notice and date', async () => {
      // Real scenario: User on rent-arrears-dispute, clicks back
      // CCD has notice=Yes, date=2022-01-01, user confirmed yes
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(true);
      mockReq.session.formData = { 'confirmation-of-notice-given': { confirmNoticeGiven: 'yes' } };

      expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-date-when-provided');
    });

    it('handles non-rent arrears scenario without notice date', async () => {
      // Real scenario: User on non-rent-arrears-dispute, clicks back
      // CCD has notice=Yes, NO date, user confirmed yes
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);
      mockReq.session.formData = { 'confirmation-of-notice-given': { confirmNoticeGiven: 'yes' } };

      expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-date-when-not-provided');
    });

    it('handles user rejection scenario', async () => {
      // Real scenario: User rejected notice on confirmation-of-notice-given
      // Goes directly to rent-arrears-dispute, clicks back
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(true);
      mockReq.session.formData = { 'confirmation-of-notice-given': { confirmNoticeGiven: 'no' } };

      expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-given');
    });

    it('handles no notice served scenario', async () => {
      // Real scenario: CCD has notice=No, goes straight to rent-arrears-dispute from tenancy-details
      (isNoticeServed as jest.Mock).mockResolvedValue(false);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);

      expect(await getPreviousPageForArrears(mockReq)).toBe('tenancy-details');
    });
  });
});
