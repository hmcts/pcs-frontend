import axios from 'axios';
import config from 'config';

import { CourtVenue } from '../../../../main/services/pcsApi/courtVenue.interface';
import { getCourtVenues, getRootGreeting } from '../../../../main/services/pcsApi/pcsApiService';

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
      epimId: 101,
      id: 1001,
      name: 'some name',
    },
  ];

  stubAxiosGet(expectedCourtVenues);

  const postcode: string = 'PC12 3AQ';

  return getCourtVenues(postcode).then((actualCourtVenues: CourtVenue[]) => {
    expect(actualCourtVenues).toEqual(expectedCourtVenues);
    expect(axios.get).toHaveBeenCalledWith(`${testApiBase}/courts?postcode=${encodeURIComponent(postcode)}`);
  });
});

function stubAxiosGet(data: unknown) {
  (axios.get as jest.Mock).mockResolvedValue({ data });
}
