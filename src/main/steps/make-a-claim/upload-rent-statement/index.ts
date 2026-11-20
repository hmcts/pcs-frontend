import { createUploadStep } from '../uploadStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createUploadStep(
  'upload-rent-statement',
  __dirname,
  claim => claim.rentArrears?.rentStatementDocuments,
  (claim, documents) => {
    claim.rentArrears = { ...claim.rentArrears, rentStatementDocuments: documents };
  },
  true
);
