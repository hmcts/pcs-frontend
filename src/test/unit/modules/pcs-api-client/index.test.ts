import axios from 'axios';
import config from 'config';

import { PcsApiClient } from '../../../../main/modules/pcs-api-client';
import { CourtVenue } from '../../../../main/modules/pcs-api-client/court-venue.interface';

jest.mock('axios', () => ({
  get: jest.fn(),
}));

jest.mock('config', () => ({
  get: jest.fn(),
}));

let underTest: PcsApiClient;

const testApiBase = 'http://mock-api';
beforeEach(() => {
  (config.get as jest.Mock).mockReturnValue(testApiBase);
  underTest = new PcsApiClient();
});

test('should fetch root greeting', () => {
  const expectedGreeting = 'test greeting';

  stubAxiosGet(expectedGreeting);

  return underTest.getRootGreeting().then((actualGreeting: string) => {
    expect(actualGreeting).toEqual(expectedGreeting);
    expect(axios.get).toHaveBeenCalledWith(testApiBase);
  });
});

test('should fetch court venues by postcode', () => {
  const expectedCourtVenues: CourtVenue[] = [
    {
      epimms_id: 101,
      court_venue_id: 1001,
      court_name: 'some name',
    },
  ];

  stubAxiosGet(expectedCourtVenues);

  const postcode: string = 'PC12 3AQ';

  return underTest.getCourtVenues(postcode).then((actualCourtVenues: CourtVenue[]) => {
    expect(actualCourtVenues).toEqual(expectedCourtVenues);
    expect(axios.get).toHaveBeenCalledWith(`${testApiBase}/courts?postCode=${encodeURIComponent(postcode)}`);
  });
});

function stubAxiosGet(data: unknown) {
  (axios.get as jest.Mock).mockResolvedValue({ data });
}
