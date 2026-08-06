import { redirectTo } from './navigate';

/**
 * When the page renders the `#redirect-on-back` marker (set via the
 * `redirectOnBack` step flag), we push a duplicate history entry so the first
 * Back press pops that duplicate and fires `popstate` without leaving the
 * confirmation document — at which point we redirect the user to their
 * dashboard instead of the previous page.
 *
 * We (re)arm on `pageshow`, which covers both the initial display and
 * back/forward-cache restores. Crucially, when the confirmation page is reached
 * via a redirect (e.g. the GOV.UK Pay return 303 on the payment pages), the
 * browser is still settling session history as `pageshow` fires and silently
 * drops a synchronous `pushState`. We therefore also push on deferred ticks so
 * a guard reliably lands once the navigation has committed.
 *
 * A single `popstate` listener is registered for the lifetime of the page; it
 * re-arms before redirecting so a fast/repeated Back can't slip past.
 */
export function initRedirectOnBack(): void {
  const marker = document.getElementById('redirect-on-back');
  const dashboardUrl = marker?.dataset.dashboardUrl;

  if (!marker || !dashboardUrl) {
    return;
  }

  const pushGuard = (): void => {
    history.pushState(null, document.title, location.href);
  };

  window.addEventListener('popstate', () => {
    pushGuard();
    redirectTo(dashboardUrl);
  });

  const arm = (): void => {
    pushGuard();
    setTimeout(pushGuard, 0);
    setTimeout(pushGuard, 500);
  };

  window.addEventListener('pageshow', arm);
}
