import type { Request } from 'express';

import { HTTPError } from '../../HttpError';
import { getUserToken } from '../utils/userRole';

import { MAKE_A_CLAIM_EVENT_ID, readClaim, saveClaimDraftForCase } from './claimDraft';

import type { DocumentStorage } from '@modules/documents/storage';
import type { FormFieldConfig } from '@modules/steps/formBuilder/formFieldConfig.interface';
import type { CcdCollectionItem, CcdUploadedDocument } from '@services/ccdCase.interface';
import { ccdCaseService } from '@services/ccdCaseService';
import type { CitizenPossessionClaim, ClaimDocuments } from '@services/citizenPossessionClaim.interface';
import { toCaseReference16 } from '@utils/caseReference';
import { ACCEPT_ATTRIBUTE_EXTENSIONS, UPLOAD_MAX_FILE_SIZE_MB } from '@utils/documentUploadValidation';

async function freshClaim(req: Request): Promise<{ caseId: string; claim: CitizenPossessionClaim }> {
  const caseId = toCaseReference16(req.params.caseReference);
  if (!caseId) {
    throw new HTTPError('Invalid case reference format', 404);
  }
  const fresh = await ccdCaseService.getCaseByIdForEvent(getUserToken(req), caseId, MAKE_A_CLAIM_EVENT_ID);
  return { caseId, claim: fresh.data?.citizenPossessionClaim ?? {} };
}

type UploadedDocuments = CcdCollectionItem<CcdUploadedDocument>[];

/** The claim's documents as the upload path handles them. */
export function toUploadedDocuments(documents: ClaimDocuments | undefined): UploadedDocuments {
  return (documents ?? []).map(item => ({ ...(item.id ? { id: item.id } : {}), value: { document: item.value } }));
}

/** Uploaded documents as the claim keeps them: CCD `Document` items. */
export function toClaimDocuments(documents: UploadedDocuments): ClaimDocuments {
  return documents.map(item => ({ id: item.id ?? null, value: item.value.document })) as ClaimDocuments;
}

/**
 * Where an upload page keeps its documents in the claim. Uploads and deletes arrive outside the journey's
 * event start, so each save reads the claim afresh and saves it whole: saving only the documents would wipe
 * every other answer.
 */
export function claimDocumentStorage(
  get: (claim: CitizenPossessionClaim) => ClaimDocuments | undefined,
  set: (claim: CitizenPossessionClaim, documents: ClaimDocuments) => void
): DocumentStorage {
  return {
    async read(req: Request): Promise<UploadedDocuments> {
      const claim = req.res?.locals.validatedCase ? readClaim(req) : (await freshClaim(req)).claim;
      return toUploadedDocuments(get(claim));
    },

    async readFresh(req: Request): Promise<UploadedDocuments> {
      return toUploadedDocuments(get((await freshClaim(req)).claim));
    },

    async save(req: Request, documents: UploadedDocuments): Promise<void> {
      const { caseId, claim } = await freshClaim(req);
      set(claim, toClaimDocuments(documents));
      await saveClaimDraftForCase(getUserToken(req), caseId, claim);
    },
  };
}

export function documentsField(required: boolean): FormFieldConfig {
  return {
    name: 'documents',
    type: 'file',
    required,
    accept: ACCEPT_ATTRIBUTE_EXTENSIONS,
    maxFileSize: UPLOAD_MAX_FILE_SIZE_MB,
    labelClasses: 'govuk-label--m',
    translationKey: { label: 'uploadLabel' },
  };
}
