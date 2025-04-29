import axios from 'axios';
import config from 'config';

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import type { CourtVenue } from '../../../../main/interface/courtVenue.interface';
=======
import { OIDCConfig } from '../../../../main/modules/oidc/config.interface';
=======
>>>>>>> b9cf116 (HDPI-515: update test)
import { CourtVenue } from '../../../../main/services/pcsApi/courtVenue.interface';
import {
  getCourtVenues,
  getDashboardNotifications,
  getRootGreeting,
} from '../../../../main/services/pcsApi/pcsApiService';

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
<<<<<<< HEAD
<<<<<<< HEAD
test('should fetch court venues by postcode', async () => {
=======

=======
>>>>>>> e401a8b (HDPI-515: fixing the authorization issue after merging from master)
test('should fetch court venues by postcode', () => {
>>>>>>> b9cf116 (HDPI-515: update test)
=======
test('should fetch court venues by postcode', async () => {
>>>>>>> 337ecea (HDPI-515: fixing unit test error)
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
<<<<<<< HEAD
  const mockAccessToken = 'test-token';

  const actualCourtVenues = await getCourtVenues(postcode, { accessToken: mockAccessToken });

  expect(actualCourtVenues).toEqual(expectedCourtVenues);
  expect(axios.get).toHaveBeenCalledWith(`${testApiBase}/courts?postcode=${encodeURIComponent(postcode)}`, {
    headers: {
      Authorization: `Bearer ${mockAccessToken}`,
    },
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

  return getDashboardNotifications(caseReference).then(actualNotifications => {
    expect(actualNotifications).toEqual(expectedNotifications);
    expect(axios.get).toHaveBeenCalledWith(`${testApiBase}/dashboard/${caseReference}/notifications`);
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
