import { type Request } from 'express';

import type { JourneyFlowConfig } from '../../interfaces/stepFlow.interface';
import {
  isDefendantNameKnown,
} from '../utils';

export const PROFESSIONAL_RESPOND_TO_CLAIM_ROUTE = '/professional/case/:caseReference/respond-to-claim';

export const flowConfig: JourneyFlowConfig = {
  basePath: PROFESSIONAL_RESPOND_TO_CLAIM_ROUTE,
  journeyName: 'professionalRespondToClaim',
  stepOrder: [
    'professional-start-now',
    'professional-free-legal-advice',
    'professional-defendant-name-confirmation',
  ],
  steps: {
    'professional-start-now': {
      defaultNext: 'professional-free-legal-advice',
    },
    'professional-free-legal-advice': {
      routes: [
        {
          // Route to defendant name confirmation if defendant is known
          condition: async (req: Request) => isDefendantNameKnown(req),
          nextStep: 'professional-defendant-name-confirmation',
        },
        {
          // Route to defendant name capture if defendant is unknown
          condition: async (req: Request) => !isDefendantNameKnown(req),
          nextStep: 'defendant-name-capture',
        },
      ],
      defaultNext: 'defendant-name-capture',
    },
    'professional-defendant-name-confirmation': {
      defaultNext: 'defendant-date-of-birth',
    },
  },
};
