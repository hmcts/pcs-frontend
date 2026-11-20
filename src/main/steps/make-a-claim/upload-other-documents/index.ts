import { createUploadStep } from '../uploadStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createUploadStep(
  'upload-other-documents',
  __dirname,
  claim => claim.otherInformation?.otherDocuments,
  (claim, documents) => {
    claim.otherInformation = { ...claim.otherInformation, otherDocuments: documents };
  },
  false
);
