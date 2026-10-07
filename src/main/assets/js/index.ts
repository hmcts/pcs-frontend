/// <reference types="webpack-env" />
import '../scss/main.scss';
import { initAll } from 'govuk-frontend';

import { initCounterClaimPaymentChoice } from './counter-claim-payment-choice';
import { initMultiFileUpload } from './multi-file-upload';
import { initPostcodeLookup } from './postcode-lookup';
import { initPostcodeSelection } from './postcode-select';
import { initSessionTimeout } from './session-timeout';

// The order editor is large, so only the make order page loads it.
if (document.querySelector('#make-order-form')) {
  void import(/* webpackChunkName: "make-order" */ './make-order').then(({ initMakeOrder, startWithSavedOrderTab }) => {
    startWithSavedOrderTab(initAll);
    initMakeOrder();
  });
} else {
  initAll();
}
// So is the read-only order preview, which renders with Docweave.
if (document.querySelector('[data-order-preview]')) {
  void import(/* webpackChunkName: "order-preview" */ './order-preview').then(({ initOrderPreview }) =>
    initOrderPreview()
  );
}
initPostcodeSelection();
initPostcodeLookup();
initSessionTimeout();
initMultiFileUpload();
initCounterClaimPaymentChoice();
