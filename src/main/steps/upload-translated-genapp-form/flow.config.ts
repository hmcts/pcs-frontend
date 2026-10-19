import { StepName } from './stepRegistry';

import type { JourneyFlowConfig, StepConfig } from '@modules/steps/stepFlow.interface';

export const UPLOAD_TRANSLATED_CLAIM_FORM_ROUTE = '/case/:caseReference/upload-translated-genapp-form';

export const flowConfig: JourneyFlowConfig = {
  basePath: UPLOAD_TRANSLATED_CLAIM_FORM_ROUTE,
  journeyName: 'uploadTranslatedGenAppForm',
  useShowConditions: true,
  useSessionFormData: false,
  eventId: 'ext:uploadTranslatedGenAppForm',
  // sections: respondToClaimSections,
  // nonSectionStepOrder: ['end-now', 'task-list', 'reasonable-adjustments-confirmation'],
  // First visible step of any section back-links to this hub step.
  // hubStepName: 'task-list',
  stepOrder: ['upload-documents', 'check-your-answers', 'confirmation'],
  steps: {
    'upload-documents': {
      preventBack: true,
    },
    confirmation: {
      preventBack: true,
    },
  } satisfies Partial<Record<StepName, StepConfig>>,
};
