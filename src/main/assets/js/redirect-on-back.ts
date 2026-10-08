import { redirectTo } from './navigate';

/**
 * When the page renders the `#redirect-on-back` marker, push a duplicate
 * history entry. The first Back press pops that entry and fires `popstate`
 * while the confirmation page is still open, and we then send the user to
 * the URL on the marker (the Manage Case case summary).
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
