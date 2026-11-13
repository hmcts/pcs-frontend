import { redirectTo } from './navigate';

/**
 * When the page renders the `#redirect-on-back` marker (set via the
 * `redirectOnBack` step flag), we push a duplicate history entry so the first
 * Back press pops it and fires `popstate` without leaving the confirmation
 * document — at which point we redirect to the dashboard.
 *
 * On a redirect arrival (e.g. the GOV.UK Pay 303 return on the payment pages)
 * the browser is still settling session history, so a `pushState` made too soon
 * may not create a catchable entry. We re-push on an interval on each
 * `pageshow` until Back is pressed or a cap is reached.
 *
 * Solicitors carry the destination in `data-redirect-url` (the Manage Case
 * case summary). Citizens still use `data-dashboard-url`.
 */
const REARM_INTERVAL_MS = 200;
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
