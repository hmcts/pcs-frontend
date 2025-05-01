import axios from 'axios';
import config from 'config';

import { CourtVenue } from '../../../../main/services/pcsApi/courtVenue.interface';
import { getCourtVenues, getRootGreeting, getDashboardNotifications } from '../../../../main/services/pcsApi/pcsApiService';

jest.mock('axios', () => ({
  get: jest.fn(),
}));

jest.mock('config', () => ({
  get: jest.fn(),
}));

const testApiBase = 'http://mock-api';
beforeEach(() => {
  (config.get as jest.Mock).mockReturnValue(testApiBase);
});

test('should fetch root greeting', () => {
  const expectedGreeting = 'test greeting';

  stubAxiosGet(expectedGreeting);

  return getRootGreeting().then((actualGreeting: string) => {
    expect(actualGreeting).toEqual(expectedGreeting);
    expect(axios.get).toHaveBeenCalledWith(testApiBase);
  });
});

test('should fetch court venues by postcode', () => {
  const expectedCourtVenues: CourtVenue[] = [
    {
      epimmsId: 101,
      courtVenueId: 1001,
      courtName: 'some name',
    },
  ];

  stubAxiosGet(expectedCourtVenues);

  const postcode: string = 'PC12 3AQ';

  return getCourtVenues(postcode).then((actualCourtVenues: CourtVenue[]) => {
    expect(actualCourtVenues).toEqual(expectedCourtVenues);
    expect(axios.get).toHaveBeenCalledWith(`${testApiBase}/courts?postCode=${encodeURIComponent(postcode)}`);
  });
});

test('should fetch dashboard notifications by case reference', () => {
  const expectedNotifications = [
    {
      templateId: 'template-1',
      templateValues: { foo: 'bar', count: 2 },
    },
    {
      templateId: 'template-2',
      templateValues: { baz: 'qux' },
    },
  ];

  stubAxiosGet(expectedNotifications);

  const caseReference = 123456;

  return getDashboardNotifications(caseReference).then((actualNotifications) => {
    expect(actualNotifications).toEqual(expectedNotifications);
    expect(axios.get).toHaveBeenCalledWith(`${testApiBase}/dashboard/${caseReference}/notifications`);
  });
});

function stubAxiosGet(data: unknown) {
  (axios.get as jest.Mock).mockResolvedValue({ data });
}
