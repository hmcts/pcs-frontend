import '../scss/main.scss';
import { initAll } from 'govuk-frontend';

import '../../modules/steps/formBuilder/errorClearing';
import { initPostcodeLookup } from './postcode-lookup';
import { initPostcodeSelection } from './postcode-select';
import { initSessionTimeout } from './session-timeout';

initAll();
initPostcodeSelection();
initPostcodeLookup();
initSessionTimeout();
