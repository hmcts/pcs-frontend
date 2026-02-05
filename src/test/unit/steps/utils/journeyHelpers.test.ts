import { isNoticeDateProvided } from '../../../../main/steps/utils/isNoticeDateProvided';
import { isNoticeServed } from '../../../../main/steps/utils/isNoticeServed';
import { getPreviousPageForArrears } from '../../../../main/steps/utils/journeyHelpers';


jest.mock('../../../../main/steps/utils/isNoticeDateProvided');
jest.mock('../../../../main/steps/utils/isNoticeServed');

describe('getPreviousPageForArrears', () => {
  let mockReq: any;

  beforeEach(() => {
    mockReq = {
      session: { formData: {} },
    };
    jest.clearAllMocks();
  });

  it('returns confirmation-of-notice-given when user said no/imNotSure', async () => {
    (isNoticeServed as jest.Mock).mockResolvedValue(true);
    (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);
    mockReq.session.formData = { 'confirmation-of-notice-given': { confirmNoticeGiven: 'no' } };

    expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-given');
  });

  it('returns confirmation-of-notice-date-when-provided when date provided', async () => {
    (isNoticeServed as jest.Mock).mockResolvedValue(true);
    (isNoticeDateProvided as jest.Mock).mockResolvedValue(true);

    expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-date-when-provided');
  });

  it('returns confirmation-of-notice-date-when-not-provided when date not provided', async () => {
    (isNoticeServed as jest.Mock).mockResolvedValue(true);
    (isNoticeDateProvided as jest.Mock).mockResolvedValue(false);
    mockReq.session.formData = { 'confirmation-of-notice-given': { confirmNoticeGiven: 'yes' } };

    expect(await getPreviousPageForArrears(mockReq)).toBe('confirmation-of-notice-date-when-not-provided');
  });

  it('returns tenancy-details when notice not served', async () => {
    (isNoticeServed as jest.Mock).mockResolvedValue(false);

    expect(await getPreviousPageForArrears(mockReq)).toBe('tenancy-details');
  });
});