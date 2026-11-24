import { createUploadStep } from '../uploadStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createUploadStep(
  'upload-eicr',
  __dirname,
  claim => claim.tenancy?.electricalInstallationDocuments,
  (claim, documents) => {
    claim.tenancy = { ...claim.tenancy, electricalInstallationDocuments: documents };
  },
  true
);
