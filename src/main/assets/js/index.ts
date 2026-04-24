/// <reference types="webpack-env" />
import '../scss/main.scss';
import { initAll } from 'govuk-frontend';

import { initPostcodeLookup } from './postcode-lookup';
import { initPostcodeSelection } from './postcode-select';
import { initSessionTimeout } from './session-timeout';

initAll();
initPostcodeSelection();
initPostcodeLookup();
initSessionTimeout();

// Safari: global Cache-Control no-store can break back-navigation from external sites; reload when
// the page is restored from bfcache or reached via the history API as back/forward.
window.addEventListener('pageshow', (event: PageTransitionEvent) => {
  if (event.persisted) {
    window.location.reload();
    return;
  }
  const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  if (navEntries.length > 0 && navEntries[0].type === 'back_forward') {
    window.location.reload();
  }
});

if (module.hot) {
  module.hot.accept();
}
