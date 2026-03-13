import { isNoticeDateProvided } from '../../../../main/steps/utils/isNoticeDateProvided';
import { isNoticeServed } from '../../../../main/steps/utils/isNoticeServed';
import { isTenancyStartDateKnown } from '../../../../main/steps/utils/isTenancyStartDateKnown';
import { getPreviousNoticeStep } from '../../../../main/steps/utils/journeyHelpers';

jest.mock('../../../../main/steps/utils/isNoticeDateProvided');
jest.mock('../../../../main/steps/utils/isNoticeServed');
jest.mock('../../../../main/steps/utils/isTenancyStartDateKnown');

describe('getPreviousNoticeStep', () => {
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

      expect(await getPreviousNoticeStep(mockReq)).toBe('confirmation-of-notice-given');
    });

    it('returns confirmation-of-notice-given when user said imNotSure and notice served', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);
      mockReq.session.formData = { 'confirmation-of-notice-given': { confirmNoticeGiven: 'imNotSure' } };

      expect(await getPreviousNoticeStep(mockReq)).toBe('confirmation-of-notice-given');
    });

    it('returns confirmation-of-notice-given when user said no, notice served, even if date was provided', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(true); // Date provided, but user rejected
      mockReq.session.formData = { 'confirmation-of-notice-given': { confirmNoticeGiven: 'no' } };

      expect(await getPreviousNoticeStep(mockReq)).toBe('confirmation-of-notice-given');
    });

    it('returns confirmation-of-notice-given when user said imNotSure, notice served, even if date was provided', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(true); // Date provided, but user rejected
      mockReq.session.formData = { 'confirmation-of-notice-given': { confirmNoticeGiven: 'imNotSure' } };

      expect(await getPreviousNoticeStep(mockReq)).toBe('confirmation-of-notice-given');
    });
  });

  describe('Priority 2: Notice date was provided in CCD', () => {
    it('returns confirmation-of-notice-date-when-provided when date provided and notice served', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(true);
      mockReq.session.formData = { 'confirmation-of-notice-given': { confirmNoticeGiven: 'yes' } };

      expect(await getPreviousNoticeStep(mockReq)).toBe('confirmation-of-notice-date-when-provided');
    });

    it('returns confirmation-of-notice-date-when-provided when date provided, notice served, no user answer', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(true);
      mockReq.session.formData = {}; // No confirmation answer

      expect(await getPreviousNoticeStep(mockReq)).toBe('confirmation-of-notice-date-when-provided');
    });

    it('returns confirmation-of-notice-date-when-provided when date provided, notice served, confirmNoticeGiven undefined', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(true);
      mockReq.session.formData = { 'confirmation-of-notice-given': {} };

      expect(await getPreviousNoticeStep(mockReq)).toBe('confirmation-of-notice-date-when-provided');
    });
  });

  describe('Priority 3: Notice date was NOT provided in CCD', () => {
    it('returns confirmation-of-notice-date-when-not-provided when date not provided, notice served, user confirmed yes', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);
      mockReq.session.formData = { 'confirmation-of-notice-given': { confirmNoticeGiven: 'yes' } };

      expect(await getPreviousNoticeStep(mockReq)).toBe('confirmation-of-notice-date-when-not-provided');
    });

    it('returns confirmation-of-notice-date-when-not-provided when date not provided, notice served, no user answer', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);
      mockReq.session.formData = {}; // No confirmation answer

      expect(await getPreviousNoticeStep(mockReq)).toBe('confirmation-of-notice-date-when-not-provided');
    });

    it('returns confirmation-of-notice-date-when-not-provided when date not provided, notice served, confirmNoticeGiven undefined', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);
      mockReq.session.formData = { 'confirmation-of-notice-given': {} };

      expect(await getPreviousNoticeStep(mockReq)).toBe('confirmation-of-notice-date-when-not-provided');
    });
  });

  describe('Priority 4: No notice served (fallback)', () => {
    it('returns tenancy-date-unknown when notice not served and tenancy start date is unknown', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(false);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);
      (isTenancyStartDateKnown as jest.Mock).mockResolvedValue(false);

      expect(await getPreviousNoticeStep(mockReq)).toBe('tenancy-date-unknown');
    });

    it('returns tenancy-date-details when notice not served and tenancy start date is known', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(false);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(true); // Date provided but notice not served
      (isTenancyStartDateKnown as jest.Mock).mockResolvedValue(true);

      expect(await getPreviousNoticeStep(mockReq)).toBe('tenancy-date-details');
    });

    it('returns tenancy-date-unknown when notice not served, user said no', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(false);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);
      (isTenancyStartDateKnown as jest.Mock).mockResolvedValue(false);
      mockReq.session.formData = { 'confirmation-of-notice-given': { confirmNoticeGiven: 'no' } };

      expect(await getPreviousNoticeStep(mockReq)).toBe('tenancy-date-unknown');
    });

    it('returns tenancy-date-unknown when notice not served, user said yes', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(false);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);
      (isTenancyStartDateKnown as jest.Mock).mockResolvedValue(false);
      mockReq.session.formData = { 'confirmation-of-notice-given': { confirmNoticeGiven: 'yes' } };

      expect(await getPreviousNoticeStep(mockReq)).toBe('tenancy-date-unknown');
    });
  });

  describe('Edge cases with missing session data', () => {
    it('returns correct page when session.formData is undefined', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(true);
      mockReq.session = {}; // No formData

      expect(await getPreviousNoticeStep(mockReq)).toBe('confirmation-of-notice-date-when-provided');
    });

    it('returns correct page when session is undefined', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(true);
      mockReq = {}; // No session

      expect(await getPreviousNoticeStep(mockReq)).toBe('confirmation-of-notice-date-when-provided');
    });

    it('returns tenancy-date-unknown when session is undefined and notice not served', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(false);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);
      (isTenancyStartDateKnown as jest.Mock).mockResolvedValue(false);
      mockReq = {}; // No session

      expect(await getPreviousNoticeStep(mockReq)).toBe('tenancy-date-unknown');
    });
  });

  describe('Integration with real routing scenarios', () => {
    it('handles rent arrears scenario with notice and date', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(true);
      mockReq.session.formData = { 'confirmation-of-notice-given': { confirmNoticeGiven: 'yes' } };

      expect(await getPreviousNoticeStep(mockReq)).toBe('confirmation-of-notice-date-when-provided');
    });

    it('handles non-rent arrears scenario without notice date', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);
      mockReq.session.formData = { 'confirmation-of-notice-given': { confirmNoticeGiven: 'yes' } };

      expect(await getPreviousNoticeStep(mockReq)).toBe('confirmation-of-notice-date-when-not-provided');
    });

    it('handles user rejection scenario', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(true);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(true);
      mockReq.session.formData = { 'confirmation-of-notice-given': { confirmNoticeGiven: 'no' } };

      expect(await getPreviousNoticeStep(mockReq)).toBe('confirmation-of-notice-given');
    });

    it('handles no notice served scenario', async () => {
      (isNoticeServed as jest.Mock).mockResolvedValue(false);
      (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);
      (isTenancyStartDateKnown as jest.Mock).mockResolvedValue(false);

      expect(await getPreviousNoticeStep(mockReq)).toBe('tenancy-date-unknown');
    });
  });
});
