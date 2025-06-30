import axios from 'axios';
import config from 'config';

import { getAddressesByPostcode } from '../../../main/services/osPostcodeLookupService';

jest.mock('axios');
jest.mock('config');
jest.mock('@hmcts/nodejs-logging', () => ({
  Logger: {
    getLogger: () => ({
      info: jest.fn(),
      error: jest.fn(),
    }),
  },
}));

describe('getAddressesByPostcode', () => {
  const mockAxiosGet = axios.get as jest.Mock;
  const mockConfigGet = config.get as jest.Mock;

  const baseUrl = 'https://fake.os.api';
  const token = 'fake-api-token';

  beforeEach(() => {
    mockConfigGet.mockImplementation((key: string) => {
      if (key === 'osPostcodeLookup.url') {
        return baseUrl;
      }
      if (key === 'secrets.pcs.pcs-os-client-lookup-key') {
        return token;
      }
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should return mapped addresses when OS API returns results', async () => {
    const mockResponse = {
      data: {
        results: [
          {
            DPA: {
              ADDRESS: '123 Test Street',
              BUILDING_NUMBER: '123',
              SUB_BUILDING_NAME: '',
              BUILDING_NAME: '',
              ORGANISATION_NAME: 'Org Ltd',
              THOROUGHFARE_NAME: 'Test Street',
              DEPENDENT_THOROUGHFARE_NAME: '',
              DEPENDENT_LOCALITY: '',
              DOUBLE_DEPENDENT_LOCALITY: '',
              POST_TOWN: 'Testville',
              LOCAL_CUSTODIAN_CODE_DESCRIPTION: 'Test County',
              POSTCODE: 'TE57 1NG',
              COUNTRY_CODE_DESCRIPTION: 'England',
            },
          },
        ],
      },
    };

    mockAxiosGet.mockResolvedValue(mockResponse);

    const result = await getAddressesByPostcode('TE571NG');

    expect(result).toEqual([
      {
        fullAddress: '123 Test Street',
        addressLine1: '123 Test Street',
        addressLine2: '',
        addressLine3: 'Org Ltd',
        town: 'Testville',
        county: 'Test County',
        postcode: 'TE57 1NG',
        country: 'England',
      },
    ]);

    expect(mockAxiosGet).toHaveBeenCalledWith(`${baseUrl}/postcode?postcode=TE571NG&key=${token}`);
  });

  it('should return an empty array if results are missing in response', async () => {
    mockAxiosGet.mockResolvedValue({ data: {} });

    await expect(getAddressesByPostcode('INVALID')).resolves.toEqual([]);
  });

  it('should throw an error if axios throws', async () => {
    mockAxiosGet.mockRejectedValue(new Error('API down'));

    await expect(getAddressesByPostcode('TE57 1NG')).rejects.toThrow('OS API error');
  });
});
