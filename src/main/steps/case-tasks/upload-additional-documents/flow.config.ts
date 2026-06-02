import type { Request } from 'express';

import { UPLOAD_ADDITIONAL_DOCUMENTS_JOURNEY_BASE } from '../../../constants/caseRoutes';

import { isViewAllApplicationsAvailable } from './flowConditions';

import type { JourneyFlowConfig } from '@modules/steps/stepFlow.interface';

export const confirmIfTheseDocumentsRelateToAnApplicationStep = 'confirm-if-these-documents-relate-to-an-application';
export const uploadYourDocumentsStep = 'upload-your-documents';
export const checkYourAnswersStep = 'check-your-answers';

export const flowConfig: JourneyFlowConfig = {
  basePath: UPLOAD_ADDITIONAL_DOCUMENTS_JOURNEY_BASE,
  journeyName: 'uploadAdditionalDocuments',
  useSessionFormData: false,
  stepOrder: [
    'start-evidence-upload',
    confirmIfTheseDocumentsRelateToAnApplicationStep,
    uploadYourDocumentsStep,
    checkYourAnswersStep,
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
    [confirmIfTheseDocumentsRelateToAnApplicationStep]: {},
    [uploadYourDocumentsStep]: {
      previousStep: async (req: Request) => {
        if (await isViewAllApplicationsAvailable(req, {}, {})) {
          return confirmIfTheseDocumentsRelateToAnApplicationStep;
        }
        return 'start-evidence-upload';
      },
      nextStep: checkYourAnswersStep
    },
    [checkYourAnswersStep]: {}
  },
};
