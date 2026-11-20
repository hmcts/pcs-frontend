import { claimDocumentStorage, documentsField } from './claimDocuments';
import { createMakeAClaimStep } from './formStep';

import { toDisplayDocuments } from '@modules/documents/storage';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CitizenPossessionClaim, ClaimDocuments } from '@services/citizenPossessionClaim.interface';

export const UPLOAD_TEMPLATE = 'make-a-claim/templates/upload.njk';

/** An upload page whose documents live where `get` and `set` say in the claim. */
export function createUploadStep(
  stepName: string,
  stepDir: string,
  get: (claim: CitizenPossessionClaim) => ClaimDocuments | undefined,
  set: (claim: CitizenPossessionClaim, documents: ClaimDocuments) => void,
  required: boolean
): StepDefinition {
  const documentStorage = claimDocumentStorage(stepName, get, set);
  return createMakeAClaimStep({
    stepName,
    stepDir,
    customTemplate: UPLOAD_TEMPLATE,
    documentStorage,
    fields: [documentsField(required)],
    getInitialFormData: async req => ({ documents: toDisplayDocuments(await documentStorage.read(req)) }),
  });
}
