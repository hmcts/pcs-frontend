import axios from 'axios';
import config from 'config';

import { FeeLookupParams, FeeType, getCounterClaimFeeType, getFee, getFeeDirect } from '@services/feeLookupService';

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

const COUNTERCLAIM_FLAT_FEE_FEE0450_LOOKUP_PARAMS: FeeLookupParams = {
  channel: 'default',
  event: 'issue',
  jurisdiction1: 'civil',
  jurisdiction2: 'civil',
  service: 'other',
  keyword: 'AnyOtherRemedy',
};

(config.get as jest.Mock).mockImplementation(key => {
  if (key === 'feeService.url') {
    return FEE_SERVICE_URL;
  }
  if (key === 'feeService.lookup.genAppStandardFee') {
    return STANDARD_FEE_LOOKUP_PARAMS;
  }
  if (key === 'feeService.lookup.counterClaimFlatFeeFEE0450') {
    return COUNTERCLAIM_FLAT_FEE_FEE0450_LOOKUP_PARAMS;
  }
});

(config.has as jest.Mock).mockImplementation(key => {
  if (key === 'feeService.lookup.genAppStandardFee') {
    return true;
  }
  if (key === 'feeService.lookup.counterClaimFlatFeeFEE0450') {
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

    it('should include lookup params for FEE0450 counterclaim flat fee', async () => {
      mockGet.mockResolvedValue({
        data: {
          fee_amount: 332,
        },
      });

      await getFee(FeeType.counterClaimFlatFeeFEE0450);

      expect(mockGet).toHaveBeenCalledWith(
        `${FEE_SERVICE_URL}/fees-register/fees/lookup`,
        expect.objectContaining({
          params: COUNTERCLAIM_FLAT_FEE_FEE0450_LOOKUP_PARAMS,
        })
      );
    });
  });

  describe('getCounterClaimFeeType', () => {
    it('returns FEE0450 for SOMETHING_ELSE claim type', () => {
      expect(getCounterClaimFeeType('SOMETHING_ELSE')).toEqual(FeeType.counterClaimFlatFeeFEE0450);
    });

    it('returns ranged fee type for amount up to 5,000', () => {
      expect(getCounterClaimFeeType('PAYMENT_OR_COMPENSATION', '30000')).toEqual(FeeType.counterClaimRanged);
      expect(getCounterClaimFeeType('BOTH', '500000')).toEqual(FeeType.counterClaimRanged);
    });

    it('returns FEE0507 for amount between 10,000.01 and 200,000', () => {
      expect(getCounterClaimFeeType('BOTH', '1000001')).toEqual(FeeType.counterClaimFee0507);
      expect(getCounterClaimFeeType('BOTH', '20000000')).toEqual(FeeType.counterClaimFee0507);
    });

    it('returns FEE0506 when amount exceeds 200,000', () => {
      expect(getCounterClaimFeeType('PAYMENT_OR_COMPENSATION', '20000001')).toEqual(FeeType.counterClaimFee0506);
    });

    it('throws when claim type is unsupported', () => {
      expect(() => getCounterClaimFeeType('UNKNOWN')).toThrow('Unsupported counterclaim claim type: UNKNOWN');
    });

    it('falls back to FEE0506 when amount is missing for money claim types', () => {
      expect(getCounterClaimFeeType('PAYMENT_OR_COMPENSATION')).toEqual(FeeType.counterClaimFee0506);
    });
  });

  describe('getFeeDirect', () => {
    it('returns flat amount when fee service responds with flat_amount', async () => {
      mockGet.mockResolvedValue({
        data: {
          current_version: {
            flat_amount: { amount: 123 },
          },
        },
      });

      const actualFee = await getFeeDirect('FEE0508');

      expect(mockGet).toHaveBeenCalledWith(`${FEE_SERVICE_URL}/fees-register/fees/FEE0508`);
      expect(actualFee).toBe(123);
    });

    it('returns calculated fee when fee service responds with percentage_amount', async () => {
      mockGet.mockResolvedValue({
        data: {
          current_version: {
            percentage_amount: { percentage: 5 },
          },
        },
      });

      const actualFee = await getFeeDirect('FEE0506', '20000');

      expect(actualFee).toBe(10);
    });

    it('throws when response has neither flat nor percentage amounts', async () => {
      mockGet.mockResolvedValue({
        data: {
          current_version: {},
        },
      });

      await expect(getFeeDirect('FEE0506', '20000')).rejects.toThrow('Error fetching fee');
    });

    it('throws when fee service request fails', async () => {
      mockGet.mockRejectedValue(new Error('Fee service unavailable'));

      await expect(getFeeDirect('FEE0508')).rejects.toThrow('Error fetching fee');
    });
  });
});
