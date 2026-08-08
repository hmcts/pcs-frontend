import { redirectTo } from './navigate';

/**
 * When the page renders the `#redirect-on-back` marker (set via the
 * `redirectOnBack` step flag), we push duplicate history entries so the first
 * Back press pops one and fires `popstate` without leaving the confirmation
 * document — at which point we redirect to the dashboard.
 *
 * On a redirect arrival (e.g. the GOV.UK Pay return 303 on the payment pages)
 * the browser is still settling session history, and a `pushState` made too
 * soon does not create a catchable entry. We therefore re-push across a short
 * window until a guard sticks, and re-arm on every `popstate`.
 *
 * NOTE: the `[HDPI-7150]` console logs below are temporary diagnostics for the
 * payment back-button investigation and must be removed before merge.
 */
export function initRedirectOnBack(): void {
  const marker = document.getElementById('redirect-on-back');
  const dashboardUrl = marker?.dataset.dashboardUrl;

  // eslint-disable-next-line no-console
  console.info('[HDPI-7150] init', { hasMarker: !!marker, dashboardUrl });

  if (!marker || !dashboardUrl) {
    return;
  }

  const pushGuard = (): void => {
    history.pushState(null, document.title, location.href);
  };

  window.addEventListener('popstate', () => {
    // eslint-disable-next-line no-console
    console.info('[HDPI-7150] popstate → redirecting to dashboard', { historyLength: history.length });
    pushGuard();
    redirectTo(dashboardUrl);
  });

  const arm = (): void => {
    // eslint-disable-next-line no-console
    console.info('[HDPI-7150] arm (pageshow) → pushing guards', { historyLength: history.length });
    pushGuard();
    for (const delay of [0, 300, 1000, 2500]) {
      setTimeout(pushGuard, delay);
    }
  };

  window.addEventListener('pageshow', arm);
}
