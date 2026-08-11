import { redirectTo } from './navigate';

/**
 * When the page renders the `#redirect-on-back` marker (set via the
 * `redirectOnBack` step flag), we push a duplicate history entry so the first
 * Back press pops it and fires `popstate` without leaving the confirmation
 * document — at which point we redirect to the dashboard.
 *
 * On a redirect arrival (e.g. the GOV.UK Pay 303 return on the payment pages)
 * the browser is still settling session history, so a `pushState` made too soon
 * does not create a catchable entry. A fixed burst of pushes therefore races a
 * fast Back press — the guard has not "stuck" yet and Back escapes back to
 * GOV.UK Pay. Instead we re-push on a short interval until `popstate` fires (a
 * guard stuck) or a safety cap elapses, and re-arm on every `pageshow`.
 */
const REARM_INTERVAL_MS = 200;
// ~6s worth of re-pushes: comfortably covers the post-redirect settle window,
// then stops so we don't keep bloating the history stack indefinitely.
const REARM_MAX_TICKS = 30;

export function initRedirectOnBack(): void {
  const marker = document.getElementById('redirect-on-back');
  const dashboardUrl = marker?.dataset.dashboardUrl;

  if (!marker || !dashboardUrl) {
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
    redirectTo(dashboardUrl);
  });

  const arm = (): void => {
    // Clear any interval from a previous arm so re-arms don't stack.
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
