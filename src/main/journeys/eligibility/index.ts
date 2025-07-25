import { JourneyDraft } from '../../modules/journey/engine/schema';

import confirmation from './steps/confirmation/step';
import ineligible from './steps/ineligible/step';
import page2 from './steps/page2/step';
import page3 from './steps/page3/step';
import page4 from './steps/page4/step';
import page5 from './steps/page5/step';
import start from './steps/start/step';
import summary from './steps/summary/step';

const journey: JourneyDraft = {
  meta: {
    name: 'Eligibility Check',
    description: 'Check if you are eligible to make a claim',
    version: '1.0.0',
  },
  steps: {
    start,
    page2,
    ineligible,
    page3,
    page4,
    page5,
    summary,
    confirmation,
  },
  config: {
    store: {
      type: 'session',
    },
    auth: {
      required: true,
    },
  },
};

export default journey;
