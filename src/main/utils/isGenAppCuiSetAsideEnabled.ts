import type { Request } from 'express';

export const CUI_GENAPP_SET_ASIDE = 'cui-genapp-set-aside';

// Populated once per request by the make-an-application journey middleware.
export function isGenAppCuiSetAsideEnabled(req: Request): boolean {
  return req.res?.locals.features?.genAppCuiSetAsideEnabled === true;
}
