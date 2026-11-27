import { createUploadStep } from '../uploadStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createUploadStep(
  'upload-notice',
  __dirname,
  claim => claim.notice?.noticeDocuments,
  (claim, documents) => {
    claim.notice = { ...claim.notice, noticeDocuments: documents };
  },
  true
);
