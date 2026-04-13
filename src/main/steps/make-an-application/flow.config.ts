import type { JourneyFlowConfig } from '../../interfaces/stepFlow.interface';

export const MAKE_AN_APPLICATION_ROUTE = '/case/:caseReference/make-an-application';

export const flowConfig: JourneyFlowConfig = {
  basePath: MAKE_AN_APPLICATION_ROUTE,
  journeyName: 'makeAnApplication',
  stepOrder: ['choose-an-application', 'check-your-answers'],
  steps: {
    'choose-an-application': {
      defaultNext: 'check-your-answers',
    },
    'check-your-answers': {},
  },
};
