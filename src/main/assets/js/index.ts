/// <reference types="webpack-env" />
import '../scss/main.scss';
import { initAll } from 'govuk-frontend';

import { initCounterClaimPaymentChoice } from './counter-claim-payment-choice';
import { initMakeOrder, startWithSavedOrderTab } from './make-order';
import { initMultiFileUpload } from './multi-file-upload';
import { initPostcodeLookup } from './postcode-lookup';
import { initPostcodeSelection } from './postcode-select';
import { initSessionTimeout } from './session-timeout';

startWithSavedOrderTab(initAll);
initPostcodeSelection();
initPostcodeLookup();
initSessionTimeout();
initMultiFileUpload();
initMakeOrder();
initCounterClaimPaymentChoice();
