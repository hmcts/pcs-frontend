import '../scss/main.scss';
import { initAll } from 'govuk-frontend';

import { initPostcodeSelection } from './postcode-select';
import { initPostcodeLookup } from './postcode-lookup';

initAll();
initPostcodeSelection();
initPostcodeLookup();
