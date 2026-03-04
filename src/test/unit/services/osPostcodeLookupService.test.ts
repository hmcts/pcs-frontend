import axios from 'axios';
import config from 'config';

import { getAddressesByPostcode } from '../../../main/services/osPostcodeLookupService';

jest.mock('axios');
jest.mock('config');
jest.mock('@modules/logger', () => ({
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
        addressLine1: 'Org Ltd',
        addressLine2: '123 Test Street',
        addressLine3: '',
        town: 'Testville',
        postcode: 'TE57 1NG',
      },
    ]);

    expect(mockAxiosGet).toHaveBeenCalledWith(`${baseUrl}/postcode?postcode=TE571NG&key=${token}`);
  });

  it('should skip any result that does not have a DPA property', async () => {
    const mockResponse = {
      data: {
        results: [
          { DPA: null }, // invalid
          {
            DPA: {
              ADDRESS: '456 Another Street',
              BUILDING_NUMBER: '456',
              ORGANISATION_NAME: '',
              SUB_BUILDING_NAME: '',
              BUILDING_NAME: '',
              THOROUGHFARE_NAME: 'Another Street',
              POST_TOWN: 'Elsewhere',
              LOCAL_CUSTODIAN_CODE_DESCRIPTION: 'Else County',
              POSTCODE: 'EL57 2RE',
              COUNTRY_CODE_DESCRIPTION: 'England',
            },
          },
        ],
      },
    };

    mockAxiosGet.mockResolvedValue(mockResponse);

    const result = await getAddressesByPostcode('EL572RE');

    expect(result).toEqual([
      {
        fullAddress: '456 Another Street',
        addressLine1: '456 Another Street',
        addressLine2: '',
        addressLine3: '',
        town: 'Elsewhere',
        postcode: 'EL57 2RE',
      },
    ]);
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
