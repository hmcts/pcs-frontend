import type { Request } from 'express';

export const GENAPP_CUI_SET_ASIDE = 'genapp-cui-set-aside';

// Populated once per request by the make-an-application journey middleware.
export function isGenAppCuiSetAsideEnabled(req: Request): boolean {
  return req.res?.locals.features?.genAppCuiSetAsideEnabled === true;
}
