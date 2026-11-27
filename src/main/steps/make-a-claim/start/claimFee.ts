import { Logger } from '@modules/logger';
import { getClaimIssueFee } from '@services/pcsApi/pcsApiService';

const logger = Logger.getLogger('makeAClaimFee');

export const CLAIM_FEE_TTL_MS = 60 * 60 * 1000;

let cached: { amount: string; expiresAt: number } | undefined;
let inFlight: Promise<string> | undefined;

/** Formats pounds as the pay page does, without the pence when the amount is a whole number of pounds. */
export function formatFee(amount: string): string {
  const pounds = Number(amount);
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: Number.isInteger(pounds) ? 0 : 2,
  }).format(pounds);
}

async function lookUp(): Promise<string> {
  const { amount } = await getClaimIssueFee();
  cached = { amount, expiresAt: Date.now() + CLAIM_FEE_TTL_MS };
  return amount;
}

/** The formatted claim issue fee, kept for an hour, or undefined when the fees register cannot be reached. */
export async function claimIssueFee(): Promise<string | undefined> {
  try {
    if (cached && cached.expiresAt > Date.now()) {
      return formatFee(cached.amount);
    }
    inFlight ??= lookUp().finally(() => {
      inFlight = undefined;
    });
    return formatFee(await inFlight);
  } catch (error) {
    logger.error('Could not look up the claim issue fee', error);
    return undefined;
  }
}

export function clearClaimIssueFeeCache(): void {
  cached = undefined;
  inFlight = undefined;
}
