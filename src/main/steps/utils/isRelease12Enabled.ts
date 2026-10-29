import type { Request } from 'express';

/**
 * Synchronous read of the `release-1.2-enabled` flag for respond-to-claim journey code.
 *
 * Only valid after `respondToClaimFeatureMiddleware` has run (RTC routes). Use in sync
 * `showCondition` functions, CYA builders, and navigation helpers.
 *
 * Routes outside the RTC middleware stack must call `isRespondToClaimEnabledForRelease`
 * directly in an async handler instead.
 */
export function isRelease12Enabled(req: Request): boolean {
  return req.res?.locals?.release12Enabled === true;
}
