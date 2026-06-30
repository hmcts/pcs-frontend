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
  amount_or_volume?: number;
}

export enum FeeType {
  genAppStandardFee,
  genAppMaxFee,
  counterClaimFlatFeeFEE0450,
  counterClaimRanged,
  counterClaim,
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
    return FeeType.counterClaim;
  }

  const amountInPounds = amountInPence / 100;

  if (amountInPounds <= 5_000) {
    return FeeType.counterClaimRanged;
  }
  return FeeType.counterClaim;
};

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

export const getFee = async (feeType: FeeType, claimAmountInPence?: string): Promise<number> => {
  const params: FeeLookupParams = { ...getFeeLookupParams(feeType) };

  if (claimAmountInPence) {
    params.amount_or_volume = Number(claimAmountInPence) / 100;
  }

  const url = `${getBaseUrl()}/fees-register/fees/lookup`;

  try {
    const response = await axios.get<FeeLookupResponse>(url, { params });
    return response.data.fee_amount;
  } catch (e) {
    logger.error('Fee lookup request failed', { err: e, url, params });
    const error = new Error('Error fetching fee');
    (error as Error & { cause?: unknown }).cause = e;
    throw error;
  }
};
