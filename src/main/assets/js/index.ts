/// <reference types="webpack-env" />
import '../scss/main.scss';
import { initAll } from 'govuk-frontend';

import { initCounterClaimPaymentChoice } from './counter-claim-payment-choice';
import { initMakeOrder } from './make-order';
import { initMultiFileUpload } from './multi-file-upload';
import { initPostcodeLookup } from './postcode-lookup';
import { initPostcodeSelection } from './postcode-select';
import { initSessionTimeout } from './session-timeout';

initAll();
initPostcodeSelection();
initPostcodeLookup();
initSessionTimeout();
initMultiFileUpload();
const disposeMakeOrder = initMakeOrder();
initCounterClaimPaymentChoice();

if (module.hot) {
  // Dispose the order editor first, otherwise the reloaded module mounts a second
  // editor over the same element.
  module.hot.dispose(() => disposeMakeOrder());
  module.hot.accept();
}
