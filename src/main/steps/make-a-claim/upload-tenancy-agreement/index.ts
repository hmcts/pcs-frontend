import { createUploadStep } from '../uploadStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createUploadStep(
  'upload-tenancy-agreement',
  __dirname,
  claim => claim.tenancy?.tenancyAgreementDocuments,
  (claim, documents) => {
    claim.tenancy = { ...claim.tenancy, tenancyAgreementDocuments: documents };
  },
  true
);
