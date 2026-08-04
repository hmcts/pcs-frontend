import { redirectTo } from './navigate';

/**
 * When the page renders the `#redirect-on-back` marker (set via the
 * `redirectOnBack` step flag), we push a duplicate history entry so that the
 * first Back press pops that duplicate and fires `popstate` without leaving the
 * confirmation document. At that point we redirect the user to their dashboard
 * instead of the previous page.
 *
 * A single `popstate` listener is registered for the lifetime of the page so
 * that repeated bfcache restores don't accumulate duplicate listeners.
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
    // Re-block first so a fast/repeated Back can't slip past before we navigate.
    pushGuard();
    redirectTo(dashboardUrl);
  });

  pushGuard();

  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      pushGuard();
    }
  });
}
