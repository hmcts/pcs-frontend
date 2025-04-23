import axios from 'axios';
import config from 'config';

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import type { CourtVenue } from '../../../../main/interface/courtVenue.interface';
=======
import { OIDCConfig } from '../../../../main/modules/oidc/config.interface';
=======
>>>>>>> b9cf116 (HDPI-515: update test)
import { CourtVenue } from '../../../../main/services/pcsApi/courtVenue.interface';
>>>>>>> 3c0ea47 (HDPI-515: fixing linting and unit test errors)
=======
import { CourtVenue } from '../../../../main/interface/courtVenue.interface';
>>>>>>> a44e576 (HDPI-515: clean up)
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
<<<<<<< HEAD
<<<<<<< HEAD
test('should fetch court venues by postcode', async () => {
=======

test('should fetch court venues by postcode', () => {
>>>>>>> b9cf116 (HDPI-515: update test)
  const expectedCourtVenues: CourtVenue[] = [
    {
      epimId: 101,
      id: 1001,
      name: 'some name',
    },
  ];

  stubAxiosGet(expectedCourtVenues);

  const postcode: string = 'PC12 3AQ';
<<<<<<< HEAD
  const mockAccessToken = 'test-token';

  const actualCourtVenues = await getCourtVenues(postcode, { accessToken: mockAccessToken });

  expect(actualCourtVenues).toEqual(expectedCourtVenues);
  expect(axios.get).toHaveBeenCalledWith(`${testApiBase}/courts?postcode=${encodeURIComponent(postcode)}`, {
    headers: {
      Authorization: `Bearer ${mockAccessToken}`,
    },
=======

  return getCourtVenues(postcode).then((actualCourtVenues: CourtVenue[]) => {
    expect(actualCourtVenues).toEqual(expectedCourtVenues);
    expect(axios.get).toHaveBeenCalledWith(`${testApiBase}/courts?postcode=${encodeURIComponent(postcode)}`);
>>>>>>> b9cf116 (HDPI-515: update test)
  });
});

function stubAxiosGet(data: unknown) {
  (axios.get as jest.Mock).mockResolvedValue({ data });
}
<<<<<<< HEAD
=======
>>>>>>> 3c0ea47 (HDPI-515: fixing linting and unit test errors)
=======
>>>>>>> b9cf116 (HDPI-515: update test)
