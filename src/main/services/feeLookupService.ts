import axios from 'axios';
import config from 'config';

import { Logger } from '@modules/logger';

const logger = Logger.getLogger('feeLookupService');

export interface FeeLookupParams {
  service: string;
  jurisdiction1: string;
  jurisdiction2: string;
  channel: string;
  event: string;
  keyword: string;
}

export enum FeeType {
  genAppStandardFee,
  genAppMaxFee,
  counterClaimFlatFeeFEE0450,
  counterClaimFee0506,
  counterClaimFee0507,
  counterClaimFee0508,
  counterClaimFee0509,
  counterClaimFee0510,
  counterClaimFee0511,
  counterClaimFee0512,
  counterClaimFee0513,
  counterClaimFee0514,
}

export const getCounterClaimFeeType = (claimType?: string, claimAmountInPence?: string): FeeType => {
  if (claimType === 'SOMETHING_ELSE') {
    return FeeType.counterClaimFlatFeeFEE0450;
  }

  if (claimType !== 'PAYMENT_OR_COMPENSATION' && claimType !== 'BOTH') {
    throw new Error(`Unsupported counterclaim claim type: ${claimType}`);
  }

  const amountInPence = Number(claimAmountInPence);
  if (Number.isNaN(amountInPence) || amountInPence < 0) {
    return FeeType.counterClaimFee0506;
  }

  const amountInPounds = amountInPence / 100;

  if (amountInPounds <= 300) {
    return FeeType.counterClaimFee0514;
  }
  if (amountInPounds <= 500) {
    return FeeType.counterClaimFee0513;
  }
  if (amountInPounds <= 1_000) {
    return FeeType.counterClaimFee0512;
  }
  if (amountInPounds <= 1_500) {
    return FeeType.counterClaimFee0511;
  }
  if (amountInPounds <= 3_000) {
    return FeeType.counterClaimFee0510;
  }
  if (amountInPounds <= 5_000) {
    return FeeType.counterClaimFee0509;
  }
  if (amountInPounds <= 10_000) {
    return FeeType.counterClaimFee0508;
  }
  if (amountInPounds <= 200_000) {
    return FeeType.counterClaimFee0507;
  }
  return FeeType.counterClaimFee0506;
};

interface FeeLookupResponse {
  code: string;
  description: string;
  version: number;
  fee_amount: number;
}

interface FeeDirectResponse {
  current_version: {
    flat_amount?: { amount: number };
    percentage_amount?: { percentage: number };
  };
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
    return response.data.fee_amount;
  } catch (e) {
    logger.error('Fee lookup request failed', { err: e, url, params: feeLookupParams });
    throw new Error('Error fetching fee');
  }
};

export const DIRECT_LOOKUP_FEE_CODES: Partial<Record<FeeType, string>> = {
  [FeeType.counterClaimFee0506]: 'FEE0506',
  [FeeType.counterClaimFee0507]: 'FEE0507',
  [FeeType.counterClaimFee0508]: 'FEE0508',
};

export const getFeeDirect = async (feeCode: string, claimAmountInPence?: string): Promise<number> => {
  const url = `${getBaseUrl()}/fees-register/fees/${feeCode}`;

  try {
    const response = await axios.get<FeeDirectResponse>(url);
    const cv = response.data.current_version;
    if (cv.flat_amount) {
      return cv.flat_amount.amount;
    }
    if (cv.percentage_amount) {
      return (Number(claimAmountInPence) / 100) * (cv.percentage_amount.percentage / 100);
    }
    throw new Error(`Unknown fee amount type for ${feeCode}`);
  } catch (e) {
    logger.error('Fee lookup request failed', { err: e, url, feeCode });
    throw new Error('Error fetching fee');
  }
};
