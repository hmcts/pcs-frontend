import 'reflect-metadata';

import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';

import { PostcodeService } from '../../../../main/nest/postcode/postcode.service';

jest.mock('axios');
jest.mock('config', () => ({
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      'osPostcodeLookup.url': 'https://api.os.uk/search/places/v1',
      'secrets.pcs.pcs-os-client-lookup-key': 'test-api-key',
    };
    return config[key];
  }),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PostcodeService', () => {
  let service: PostcodeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PostcodeService],
    }).compile();

    service = module.get<PostcodeService>(PostcodeService);
    jest.clearAllMocks();
  });

  describe('getAddressesByPostcode', () => {
    const mockOSResponse = {
      data: {
        header: {
          uri: 'https://api.os.uk/search/places/v1/postcode',
          query: 'postcode=SW1A1AA',
          offset: 0,
          totalresults: 1,
          format: 'JSON',
          dataset: 'DPA',
          lr: 'EN,CY',
          maxresults: 100,
          epoch: '94',
          lastupdate: '2024-01-01',
          output_srs: 'EPSG:27700',
        },
        results: [
          {
            DPA: {
              ADDRESS: '10 DOWNING STREET, LONDON, SW1A 2AA',
              BUILDING_NUMBER: '10',
              THOROUGHFARE_NAME: 'DOWNING STREET',
              POST_TOWN: 'LONDON',
              POSTCODE: 'SW1A 2AA',
              COUNTRY_CODE: 'E',
            },
          },
        ],
      },
    };

    it('should return addresses for a valid postcode', async () => {
      mockedAxios.get.mockResolvedValue(mockOSResponse);

      const result = await service.getAddressesByPostcode('SW1A 2AA');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        fullAddress: '10 DOWNING STREET, LONDON, SW1A 2AA',
        addressLine1: '10 DOWNING STREET',
        town: 'LONDON',
        postcode: 'SW1A 2AA',
        country: 'ENGLAND',
      });
    });

    it('should throw BadRequestException for empty postcode', async () => {
      await expect(service.getAddressesByPostcode('')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for whitespace-only postcode', async () => {
      await expect(service.getAddressesByPostcode('   ')).rejects.toThrow(BadRequestException);
    });

    it('should return empty array when no results', async () => {
      mockedAxios.get.mockResolvedValue({ data: { results: null } });

      const result = await service.getAddressesByPostcode('XX1 1XX');

      expect(result).toEqual([]);
    });

    it('should throw BadGatewayException on API error', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(service.getAddressesByPostcode('SW1A 2AA')).rejects.toThrow(BadGatewayException);
    });

    it('should correctly map country codes', async () => {
      const responseWithScotland = {
        data: {
          results: [
            {
              DPA: {
                ADDRESS: '1 PRINCES STREET, EDINBURGH, EH2 2EQ',
                POST_TOWN: 'EDINBURGH',
                POSTCODE: 'EH2 2EQ',
                COUNTRY_CODE: 'S',
              },
            },
          ],
        },
      };
      mockedAxios.get.mockResolvedValue(responseWithScotland);

      const result = await service.getAddressesByPostcode('EH2 2EQ');

      expect(result[0].country).toBe('SCOTLAND');
    });

    it('should handle addresses with organisation names', async () => {
      const responseWithOrg = {
        data: {
          results: [
            {
              DPA: {
                ADDRESS: 'ACME LTD, 1 HIGH STREET, LONDON, SW1A 1AA',
                ORGANISATION_NAME: 'ACME LTD',
                BUILDING_NUMBER: '1',
                THOROUGHFARE_NAME: 'HIGH STREET',
                POST_TOWN: 'LONDON',
                POSTCODE: 'SW1A 1AA',
                COUNTRY_CODE: 'E',
              },
            },
          ],
        },
      };
      mockedAxios.get.mockResolvedValue(responseWithOrg);

      const result = await service.getAddressesByPostcode('SW1A 1AA');

      expect(result[0].addressLine1).toBe('ACME LTD');
    });

    it('should filter out null DPA results', async () => {
      const responseWithNullDPA = {
        data: {
          results: [
            { DPA: null },
            {
              DPA: {
                ADDRESS: '1 HIGH STREET, LONDON, SW1A 1AA',
                POST_TOWN: 'LONDON',
                POSTCODE: 'SW1A 1AA',
              },
            },
          ],
        },
      };
      mockedAxios.get.mockResolvedValue(responseWithNullDPA);

      const result = await service.getAddressesByPostcode('SW1A 1AA');

      expect(result).toHaveLength(1);
    });
  });
});
