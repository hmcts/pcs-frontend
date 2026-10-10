import { redirectTo } from './navigate';

/**
 * When the page renders the `#redirect-on-back` marker (set via the
 * `redirectOnBack` step flag), we push a duplicate history entry so the first
 * Back press pops it and fires `popstate` without leaving the confirmation
 * document — at which point we redirect to the dashboard.
 *
 * On a redirect arrival (e.g. the GOV.UK Pay 303 return on the payment pages)
 * the browser is still settling session history, so a `pushState` made too soon
 * may not create a catchable entry. We re-push across a short window on each
 * `pageshow` to cover that.
 *
 * Solicitors carry the destination in `data-redirect-url` (the Manage Case
 * case summary). Citizens still use `data-dashboard-url`.
 */
export function initRedirectOnBack(): void {
  const marker = document.getElementById('redirect-on-back');
  const redirectUrl = marker?.dataset.redirectUrl || marker?.dataset.dashboardUrl;

  if (!marker || !redirectUrl) {
    return;
  }

  const pushGuard = (): void => {
    history.pushState(null, document.title, location.href);
  };

  window.addEventListener('popstate', () => {
    pushGuard();
    redirectTo(redirectUrl);
  });

  const arm = (): void => {
    pushGuard();
    for (const delay of [0, 300, 1000, 2500]) {
      setTimeout(pushGuard, delay);
    }
  };

  window.addEventListener('pageshow', arm);
}
