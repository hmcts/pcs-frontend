import type { Request } from 'express';
import { cloneDeep } from 'lodash';

import { HTTPError } from '../../HttpError';
import { getUserToken } from '../utils/userRole';

import { MAKE_A_CLAIM_EVENT_ID, readClaim, saveClaimDraftForCase } from './claimDraft';
import { confirmationsAfterSave } from './sectionConfirmation';

import type { DocumentStorage } from '@modules/documents/storage';
import type { FormFieldConfig } from '@modules/steps/formBuilder/formFieldConfig.interface';
import type { CcdCollectionItem, CcdUploadedDocument } from '@services/ccdCase.interface';
import { ccdCaseService } from '@services/ccdCaseService';
import type { CitizenPossessionClaim, ClaimDocuments } from '@services/citizenPossessionClaim.interface';
import { toCaseReference16 } from '@utils/caseReference';
import { type UploadRestriction, bytesToMb } from '@utils/documentUploadValidation';

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
function toUploadedDocuments(documents: ClaimDocuments | undefined): UploadedDocuments {
  return (documents ?? []).map(item => ({ ...(item.id ? { id: item.id } : {}), value: { document: item.value } }));
}

/** Uploaded documents as the claim keeps them: CCD `Document` items. */
function toClaimDocuments(documents: UploadedDocuments): ClaimDocuments {
  return documents.map(item => ({ id: item.id ?? null, value: item.value.document })) as ClaimDocuments;
}

/**
 * Where an upload page keeps its documents in the claim. Uploads and deletes arrive outside the journey's
 * event start, so each save reads the claim afresh and saves it whole: saving only the documents would wipe
 * every other answer. A change to the documents withdraws the confirmation of the summary showing them.
 */
export function claimDocumentStorage(
  stepName: string,
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
      const { caseId, claim: saved } = await freshClaim(req);
      const claim = cloneDeep(saved);
      set(claim, toClaimDocuments(documents));
      claim.confirmedSections = confirmationsAfterSave(saved, claim, stepName);
      await saveClaimDraftForCase(getUserToken(req), caseId, claim);
    },
  };
}

/** What every make-a-claim upload takes: the other formats the general allowlist accepts can carry macros. */
export const MAKE_A_CLAIM_UPLOAD: UploadRestriction = {
  types: [
    { extension: '.pdf', mimeType: 'application/pdf' },
    {
      extension: '.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    },
    { extension: '.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  ],
  maxBytes: 20 * 1024 * 1024,
  wrongTypeKey: 'errors.documentUpload.restrictedFileType',
  tooLargeKey: 'errors.documentUpload.restrictedFileTooLarge',
};

export function documentsField(required: boolean): FormFieldConfig {
  return {
    name: 'documents',
    type: 'file',
    required,
    accept: MAKE_A_CLAIM_UPLOAD.types.map(type => type.extension).join(','),
    maxFileSize: bytesToMb(MAKE_A_CLAIM_UPLOAD.maxBytes),
    labelClasses: 'govuk-label--m',
    translationKey: { label: 'uploadLabel', hint: 'uploadHint' },
  };
}
