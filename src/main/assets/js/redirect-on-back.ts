import { redirectTo } from './navigate';

/**
 * When the page renders the `#redirect-on-back` marker (set via the
 * `redirectOnBack` step flag), we push a duplicate history entry and listen for
 * `popstate`. The first Back press then pops that duplicate and fires `popstate`
 * without leaving the confirmation document, at which point we redirect the user
 * to their dashboard instead of the previous page.
 */
export function initRedirectOnBack(): void {
  const marker = document.getElementById('redirect-on-back');
  const dashboardUrl = marker?.dataset.dashboardUrl;

  if (!marker || !dashboardUrl) {
    return;
  }

  let armed = false;

  const arm = (): void => {
    if (armed) {
      return;
    }
    armed = true;

    history.pushState(null, document.title, location.href);

    window.addEventListener('popstate', () => {
      redirectTo(dashboardUrl);
    });
  };

  arm();

  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      armed = false;
      arm();
    }
  });
}
