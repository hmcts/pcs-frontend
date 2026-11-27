import { taskListPath } from '../flow.config';
import { caseReferenceOf } from '../formStep';
import { createUploadStep } from '../uploadStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

/** The only page of the Upload documents task, so Save and continue returns to the task list. */
export const step: StepDefinition = createUploadStep(
  'upload-other-documents',
  __dirname,
  claim => claim.otherInformation?.otherDocuments,
  (claim, documents) => {
    claim.otherInformation = { ...claim.otherInformation, otherDocuments: documents };
  },
  false,
  async req => taskListPath(caseReferenceOf(req))
);
