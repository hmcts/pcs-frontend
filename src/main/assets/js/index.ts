/// <reference types="webpack-env" />
import '../scss/main.scss';
import { initAll } from 'govuk-frontend';

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
initMakeOrder();

if (module.hot) {
  module.hot.accept();
}
