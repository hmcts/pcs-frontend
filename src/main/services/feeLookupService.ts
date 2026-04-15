import axios from 'axios';
import config from 'config';

import { FeeLookupParams, FeeType } from '../interfaces/feeService.interface';

import { Logger } from '@modules/logger';

const logger = Logger.getLogger('feeLookupService');

interface FeeLookupResponse {
  code: string;
  description: string;
  version: number;
  fee_amount: number;
}

function getBaseUrl(): string {
  return config.get('feeService.url');
}

function getFeeLookupParams(feeType: FeeType): FeeLookupParams {
  const feeTypeName = FeeType[feeType];
  const configPath = `feeService.lookup.${feeTypeName}`;
  if (!config.has(configPath)) {
    throw new Error(`No config found for fee type ${feeTypeName}`);
  }
  return config.get<FeeLookupParams>(configPath);
}

export const getFee = async (feeType: FeeType): Promise<number> => {
  const feeLookupParams = getFeeLookupParams(feeType);

  const url = `${getBaseUrl()}/fees-register/fees/lookup`;

  try {
    const response = await axios.get<FeeLookupResponse>(url, { params: feeLookupParams });

    logger.debug(`Fee service response data: ${JSON.stringify(response.data, null, 2)}`);
    return response.data.fee_amount;
  } catch (e) {
    logger.error('Error fetching fee ', e);
    throw new Error('Error fetching fee');
  }
};
