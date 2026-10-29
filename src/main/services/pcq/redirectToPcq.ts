import type { Request } from 'express';

import { startPcq } from './startPcq';

/**
 * Hands the citizen off to the PCQ questionnaire when it is available.
 *
 * Returns true when a redirect was issued — callers must not write to the response afterwards.
 * Both the step controller and the form-builder post handler short-circuit on `res.headersSent`.
 *
 * The redirect has to be issued here rather than returned from `resolveRedirectAfterPost`: that
 * hook feeds `safeRedirect303`, which blocks off-site origins and would bounce the citizen to '/'
 * instead of sending them to PCQ.
 *
 * A false return means PCQ is disabled, unavailable, or already answered by this party. Callers
 * should carry on to their normal next step — an optional questionnaire must never block the
 * citizen's response.
 */
export async function redirectToPcq(req: Request): Promise<boolean> {
  const redirectUrl = await startPcq(req);
  if (!redirectUrl) {
    return false;
  }

  req.res?.redirect(303, redirectUrl);
  return true;
}
