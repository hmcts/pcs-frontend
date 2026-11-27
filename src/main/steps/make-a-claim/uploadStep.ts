import type { Request } from 'express';

import { MAKE_A_CLAIM_UPLOAD, claimDocumentStorage, documentsField } from './claimDocuments';
import { createMakeAClaimStep } from './formStep';

import { toDisplayDocuments } from '@modules/documents/storage';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CitizenPossessionClaim, ClaimDocuments } from '@services/citizenPossessionClaim.interface';

const UPLOAD_TEMPLATE = 'make-a-claim/templates/upload.njk';

/**
 * An upload page whose documents live where `get` and `set` say in the claim. Every one takes only
 * MAKE_A_CLAIM_UPLOAD's types and size; the upload route reads that from this step, not from the request.
 */
export function createUploadStep(
  stepName: string,
  stepDir: string,
  get: (claim: CitizenPossessionClaim) => ClaimDocuments | undefined,
  set: (claim: CitizenPossessionClaim, documents: ClaimDocuments) => void,
  required: boolean,
  resolveRedirectAfterPost?: (req: Request) => Promise<string | undefined>
): StepDefinition {
  const documentStorage = claimDocumentStorage(stepName, get, set);
  return createMakeAClaimStep({
    stepName,
    stepDir,
    customTemplate: UPLOAD_TEMPLATE,
    documentStorage,
    fields: [documentsField(required)],
    uploadValidation: { restriction: MAKE_A_CLAIM_UPLOAD },
    getInitialFormData: async req => ({ documents: toDisplayDocuments(await documentStorage.read(req)) }),
    ...(resolveRedirectAfterPost ? { resolveRedirectAfterPost } : {}),
  });
}
