import { UPLOAD_ADDITIONAL_DOCUMENTS_JOURNEY_BASE } from '../../../constants/caseRoutes';

import type { JourneyFlowConfig } from '@modules/steps/stepFlow.interface';

export const confirmIfTheseDocumentsRelateToAnApplicationStep = 'confirm-if-these-documents-relate-to-an-application';
export const uploadYourDocumentsStep = 'upload-your-documents';

export const flowConfig: JourneyFlowConfig = {
  basePath: UPLOAD_ADDITIONAL_DOCUMENTS_JOURNEY_BASE,
  entryStepIdAtBasePath: 'start',
  journeyName: 'uploadAdditionalDocuments',
  useSessionFormData: false,
  stepOrder: ['start', confirmIfTheseDocumentsRelateToAnApplicationStep, uploadYourDocumentsStep],
  steps: {
    start: {
      routes: [
        {
          condition: async (_req, _form, data) => data.documentsRelateToGeneralApplication === 'yes',
          nextStep: confirmIfTheseDocumentsRelateToAnApplicationStep,
        },
        {
          condition: async (_req, _form, data) => data.documentsRelateToGeneralApplication === 'no',
          nextStep: uploadYourDocumentsStep,
        },
        {
          condition: async () => true,
          nextStep: uploadYourDocumentsStep,
        },
      ],
    },
    [confirmIfTheseDocumentsRelateToAnApplicationStep]: {},
    [uploadYourDocumentsStep]: {},
  },
};
