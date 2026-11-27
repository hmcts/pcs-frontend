import { createUploadStep } from '../uploadStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createUploadStep(
  'upload-epc',
  __dirname,
  claim => claim.tenancy?.energyPerformanceDocuments,
  (claim, documents) => {
    claim.tenancy = { ...claim.tenancy, energyPerformanceDocuments: documents };
  },
  true
);
