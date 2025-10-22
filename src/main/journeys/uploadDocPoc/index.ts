import { JourneyDraft } from '../../modules/journey/engine/schema';

import page2 from './steps/page2/step';
import start from './steps/start/step';

const journey: JourneyDraft = {
  meta: {
    name: 'Document Upload POC',
    description: 'Proof of concept for document upload functionality',
    version: '1.0.0',
  },
  steps: {
    start,
    page2,
  },
  config: {
    i18nNamespace: 'uploadDocPoc',
    store: {
      type: 'session',
    },
    auth: {
      required: true,
    },
  },
};

export default journey;
