import { redirectTo } from './navigate';

/**
 * When the page renders the `#redirect-on-back` marker (set via the
 * `redirectOnBack` step flag), we push a duplicate history entry so the first
 * Back press pops it and fires `popstate` without leaving the confirmation
 * document — at which point we redirect.
 *
 * Solicitors carry the destination in `data-redirect-url` (the Manage Case
 * case summary). Citizens still use `data-dashboard-url`.
 *
 * On arrival from the submit redirect the browser is still settling session
 * history, so a `pushState` made too soon may not create a catchable entry.
 * A short burst also loses to a fast Back press. Re-push on a short interval
 * until `popstate` fires or a safety cap elapses, and re-arm on every
 * `pageshow`.
 */
const REARM_INTERVAL_MS = 200;
// ~6s of re-pushes. Long enough for the history entry to stick, then stop so
// the stack does not keep growing.
const REARM_MAX_TICKS = 30;

export function initRedirectOnBack(): void {
  const marker = document.getElementById('redirect-on-back');
  const redirectUrl = marker?.dataset.redirectUrl || marker?.dataset.dashboardUrl;

  if (!marker || !redirectUrl) {
    return;
  }

  const pushGuard = (): void => {
    history.pushState(null, document.title, location.href);
  };

  let rearmInterval: ReturnType<typeof setInterval> | undefined;

  const stopRearming = (): void => {
    if (rearmInterval !== undefined) {
      clearInterval(rearmInterval);
      rearmInterval = undefined;
    }
  };

  window.addEventListener('popstate', () => {
    stopRearming();
    pushGuard();
    redirectTo(redirectUrl);
  });

  const arm = (): void => {
    // A second pageshow must not leave the previous interval running as well.
    stopRearming();
    pushGuard();
    let ticks = 0;
    rearmInterval = setInterval(() => {
      pushGuard();
      if (++ticks >= REARM_MAX_TICKS) {
        stopRearming();
      }
    }, REARM_INTERVAL_MS);
  };

  window.addEventListener('pageshow', arm);
}
