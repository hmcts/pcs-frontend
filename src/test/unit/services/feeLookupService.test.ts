import axios from 'axios';
import config from 'config';

import { FeeLookupParams, FeeType, getFee } from '@services/feeLookupService';

jest.mock('axios');
jest.mock('config');

const FEE_SERVICE_URL = 'http://feeservice.test';

const STANDARD_FEE_LOOKUP_PARAMS: FeeLookupParams = {
  channel: 'test channel 1',
  event: 'test event 1',
  jurisdiction1: 'test jurisdiction 1',
  jurisdiction2: 'test jurisdiction 2',
  keyword: 'standard fee',
  service: 'test service',
};

(config.get as jest.Mock).mockImplementation(key => {
  if (key === 'feeService.url') {
    return FEE_SERVICE_URL;
  }
  if (key === 'feeService.lookup.genAppStandardFee') {
    return STANDARD_FEE_LOOKUP_PARAMS;
  }
});

(config.has as jest.Mock).mockImplementation(key => {
  if (key === 'feeService.lookup.genAppStandardFee') {
    return true;
  }
});

describe('feeLookupService', () => {
  const mockGet = axios.get as jest.Mock;

  describe('getFee', () => {
    it('should get fee for fee type', async () => {
      const expectedFee = 21.1;
      mockGet.mockResolvedValue({
        data: {
          fee_amount: expectedFee,
        },
      });

      const actualFee = await getFee(FeeType.genAppStandardFee);

      expect(mockGet).toHaveBeenCalledWith(
        `${FEE_SERVICE_URL}/fees-register/fees/lookup`,
        expect.objectContaining({
          params: STANDARD_FEE_LOOKUP_PARAMS,
        })
      );

      expect(actualFee).toEqual(expectedFee);
    });

    it('should throw error when no params for for fee type', () => {
      expect(getFee(FeeType.genAppMaxFee)).rejects.toThrow('No config found for fee type genAppMaxFee');
    });

    it('should throw error when call to Fee Service fails', () => {
      mockGet.mockRejectedValue({
        data: {
          error: 'Test error',
        },
      });

      expect(getFee(FeeType.genAppStandardFee)).rejects.toThrow('Error fetching fee');
    });
  });
});
