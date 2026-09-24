/// <reference types="webpack-env" />
import '../scss/main.scss';
import { initAll } from 'govuk-frontend';

import { initCounterClaimPaymentChoice } from './counter-claim-payment-choice';
import { initMultiFileUpload } from './multi-file-upload';
import { initPostcodeLookup } from './postcode-lookup';
import { initPostcodeSelection } from './postcode-select';
import { initRedirectOnBack } from './redirect-on-back';
import { initSessionTimeout } from './session-timeout';

initAll();
initPostcodeSelection();
initPostcodeLookup();
initSessionTimeout();
initMultiFileUpload();
initCounterClaimPaymentChoice();
initRedirectOnBack();

if (module.hot) {
  module.hot.accept();
}
