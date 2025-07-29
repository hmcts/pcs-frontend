import '../scss/main.scss';
import { initAll } from 'govuk-frontend';

import { initLanguageToggle } from './language-toggle';
import { initPostcodeSelection } from './postcode-select';

initAll();
initPostcodeSelection();
initLanguageToggle();
