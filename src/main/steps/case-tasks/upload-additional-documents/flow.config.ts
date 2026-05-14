import { UPLOAD_ADDITIONAL_DOCUMENTS_JOURNEY_BASE } from '../../../constants/caseRoutes';

import { isViewAllApplicationsAvailable } from './flowConditions';

import type { JourneyFlowConfig } from '@modules/steps/stepFlow.interface';

export const confirmIfTheseDocumentsRelateToAnApplicationStep = 'confirm-if-these-documents-relate-to-an-application';
export const uploadYourDocumentsStep = 'upload-your-documents';
export const checkYourAnswersStep = 'check-your-answers';
export const documentsSubmittedStep = 'documents-submitted';

export const flowConfig: JourneyFlowConfig = {
  basePath: UPLOAD_ADDITIONAL_DOCUMENTS_JOURNEY_BASE,
  journeyName: 'uploadAdditionalDocuments',
  useSessionFormData: false,
  stepOrder: [
    'start-evidence-upload',
    confirmIfTheseDocumentsRelateToAnApplicationStep,
    uploadYourDocumentsStep,
    checkYourAnswersStep,
    documentsSubmittedStep,
  ],
  steps: {
    'start-evidence-upload': {
      routes: [
        {
          condition: isViewAllApplicationsAvailable,
          nextStep: confirmIfTheseDocumentsRelateToAnApplicationStep,
        },
        { nextStep: uploadYourDocumentsStep },
      ],
    },
    [confirmIfTheseDocumentsRelateToAnApplicationStep]: { routes: [{ nextStep: uploadYourDocumentsStep }] },
    [uploadYourDocumentsStep]: { routes: [{ nextStep: checkYourAnswersStep }] },
    [checkYourAnswersStep]: { routes: [{ nextStep: documentsSubmittedStep }] },
    [documentsSubmittedStep]: {},
  },
};
