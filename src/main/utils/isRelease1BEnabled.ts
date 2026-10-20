import type { Request } from 'express';

export const RELEASE_1B_ENABLED = 'release-1b-enabled';

// Populated once per request by the make-an-application journey middleware.
export function isRelease1BEnabled(req: Request): boolean {
  return req.res?.locals.release1bEnabled === true;
}
