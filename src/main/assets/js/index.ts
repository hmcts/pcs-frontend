/// <reference types="webpack-env" />
import '../scss/main.scss';
import { initAll } from 'govuk-frontend';

import { initCounterClaimPaymentChoice } from './counter-claim-payment-choice';
import { initMultiFileUpload } from './multi-file-upload';
import { initOrderSubmissions } from './order-submissions';
import { initPostcodeLookup } from './postcode-lookup';
import { initPostcodeSelection } from './postcode-select';
import { initRedirectOnBack } from './redirect-on-back';
import { initSessionTimeout } from './session-timeout';

const stopSessionTimeout = initSessionTimeout();

// The order editor is large, so only the make order page loads it.
if (document.querySelector('#make-order-form')) {
  void import(/* webpackChunkName: "make-order" */ './make-order').then(({ initMakeOrder, startWithSavedOrderTab }) => {
    startWithSavedOrderTab(initAll);
    initMakeOrder();
    // The editor must sync its active tab/document before the JSON submit listener reads the form.
    initOrderSubmissions(stopSessionTimeout);
  });
} else {
  initAll();
  initOrderSubmissions(stopSessionTimeout);
}
initPostcodeSelection();
initPostcodeLookup();
initMultiFileUpload();
initRedirectOnBack();
initCounterClaimPaymentChoice();
