import { redirectTo } from './navigate';

/**
 * When the page renders the `#redirect-on-back` marker (set via the
 * `redirectOnBack` step flag), we push a duplicate history entry so that the
 * first Back press pops that duplicate and fires `popstate` without leaving the
 * confirmation document. At that point we redirect the user to their dashboard
 * instead of the previous page.
 *
 * The guard is armed on `pageshow` rather than synchronously at load. This
 * covers both the initial display and back/forward-cache restores, and — more
 * importantly — it defers the `pushState` until after the navigation has
 * committed. When we arrive via a redirect (e.g. the GOV.UK Pay return 303 on
 * the payment confirmation pages), a synchronous `pushState` at script-eval
 * time is dropped by the browser, leaving no entry to catch the first Back.
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

  window.addEventListener('pageshow', () => {
    pushGuard();
  });
}
