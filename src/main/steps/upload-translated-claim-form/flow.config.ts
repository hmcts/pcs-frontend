import type { JourneyFlowConfig, StepConfig } from '@modules/steps/stepFlow.interface';
import { StepName } from './stepRegistry';

export const UPLOAD_TRANSLATED_CLAIM_FORM_ROUTE = '/case/:caseReference/upload-translated-claim-form';

export const flowConfig: JourneyFlowConfig = {
  basePath: UPLOAD_TRANSLATED_CLAIM_FORM_ROUTE,
  journeyName: 'uploadTranslatedClaimForm',
  useShowConditions: true,
  useSessionFormData: false,
  eventId: 'ext:uploadTranslatedClaimForm',
  // sections: respondToClaimSections,
  // nonSectionStepOrder: ['end-now', 'task-list', 'reasonable-adjustments-confirmation'],
  // First visible step of any section back-links to this hub step.
  // hubStepName: 'task-list',
  stepOrder: [
    'upload-documents',
    'check-your-answers',
    'confirmation'
  ],
  steps: {
    'upload-documents': {
      preventBack: true,
    },
    'confirmation': {
      preventBack: true,
    },
  } satisfies Partial<Record<StepName, StepConfig>>,
};
