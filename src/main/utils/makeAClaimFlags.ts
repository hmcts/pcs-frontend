import type { Request } from 'express';

import { getLaunchDarklyFlag } from './getLaunchDarklyFlag';

export const PRIVATE_LANDLORD_MAKE_A_CLAIM_ENABLED = 'private-landlord-make-a-claim-enabled';

export const PRIVATE_LANDLORD_RENT_HISTORY_DESIGN = 'private-landlord-rent-history-design';

export const RENT_HISTORY_DESIGNS = ['ledger', 'table'] as const;

export type RentHistoryDesign = (typeof RENT_HISTORY_DESIGNS)[number];

export const DEFAULT_RENT_HISTORY_DESIGN: RentHistoryDesign = 'ledger';

/** Whether the journey is switched on, asked of LaunchDarkly once per request however many gates check it. */
export async function isMakeAClaimEnabled(req: Request): Promise<boolean> {
  const locals = req.res?.locals;
  if (typeof locals?.makeAClaimEnabled === 'boolean') {
    return locals.makeAClaimEnabled;
  }
  const enabled = await getLaunchDarklyFlag(req, PRIVATE_LANDLORD_MAKE_A_CLAIM_ENABLED, false);
  if (locals) {
    locals.makeAClaimEnabled = enabled;
  }
  return enabled;
}

export function toRentHistoryDesign(value: unknown): RentHistoryDesign {
  return RENT_HISTORY_DESIGNS.find(design => design === value) ?? DEFAULT_RENT_HISTORY_DESIGN;
}

/** The rent history design, asked of LaunchDarkly once per request and only while the journey is switched on. */
export async function getRentHistoryDesign(req: Request): Promise<RentHistoryDesign> {
  const locals = req.res?.locals;
  if (locals?.rentHistoryDesign) {
    return toRentHistoryDesign(locals.rentHistoryDesign);
  }
  const design = (await isMakeAClaimEnabled(req))
    ? toRentHistoryDesign(
        await getLaunchDarklyFlag<unknown>(req, PRIVATE_LANDLORD_RENT_HISTORY_DESIGN, DEFAULT_RENT_HISTORY_DESIGN)
      )
    : DEFAULT_RENT_HISTORY_DESIGN;
  if (locals) {
    locals.rentHistoryDesign = design;
  }
  return design;
}
