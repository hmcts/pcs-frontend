import type { Request } from 'express';

import { getLaunchDarklyFlag } from './getLaunchDarklyFlag';

export const PRIVATE_LANDLORD_MAKE_A_CLAIM_ENABLED = 'private-landlord-make-a-claim-enabled';

export const PRIVATE_LANDLORD_RENT_HISTORY_DESIGN = 'private-landlord-rent-history-design';

export const RENT_HISTORY_DESIGNS = ['ledger', 'table'] as const;

export type RentHistoryDesign = (typeof RENT_HISTORY_DESIGNS)[number];

export const DEFAULT_RENT_HISTORY_DESIGN: RentHistoryDesign = 'ledger';

export function isMakeAClaimEnabled(req: Request): Promise<boolean> {
  return getLaunchDarklyFlag(req, PRIVATE_LANDLORD_MAKE_A_CLAIM_ENABLED, false);
}

export function toRentHistoryDesign(value: unknown): RentHistoryDesign {
  return RENT_HISTORY_DESIGNS.find(design => design === value) ?? DEFAULT_RENT_HISTORY_DESIGN;
}

export async function getRentHistoryDesign(req: Request): Promise<RentHistoryDesign> {
  return toRentHistoryDesign(
    await getLaunchDarklyFlag<unknown>(req, PRIVATE_LANDLORD_RENT_HISTORY_DESIGN, DEFAULT_RENT_HISTORY_DESIGN)
  );
}
