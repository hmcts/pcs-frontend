import '../scss/main.scss';
import { initAll } from 'govuk-frontend';

import { initPostcodeLookup } from './postcode-lookup';
import { initPostcodeSelection } from './postcode-select';

initAll();
initPostcodeSelection();
initPostcodeLookup();
