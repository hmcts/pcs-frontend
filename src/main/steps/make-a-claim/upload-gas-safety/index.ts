import { createUploadStep } from '../uploadStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createUploadStep(
  'upload-gas-safety',
  __dirname,
  claim => claim.tenancy?.gasSafetyReportDocuments,
  (claim, documents) => {
    claim.tenancy = { ...claim.tenancy, gasSafetyReportDocuments: documents };
  },
  true
);
