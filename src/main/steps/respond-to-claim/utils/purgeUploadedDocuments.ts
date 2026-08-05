import type { Request } from 'express';

import { getUserToken } from '../../utils/userRole';

import { Logger } from '@modules/logger';
import type { CcdCollectionItem, CcdUploadedDocument } from '@services/ccdCase.interface';
import { deleteDocument } from '@services/cdamService';

const logger = Logger.getLogger('purgeUploadedDocuments');

export enum DocumentType {
  UPLOAD,
  COUNTER_CLAIM,
}

// Purge of any previously uploaded documents from CDAM.
// Mirrors the per-document delete pattern used by documentProxy.removeDraftDocument.
// CDAM failures are logged but never thrown — the normaliser will still strip the
// metadata from the draft, so the user sees a consistent state.
export async function purgeUploadedDocumentsFromCdam(req: Request, documentType: DocumentType): Promise<void> {
  const documentField =
    documentType === DocumentType.COUNTER_CLAIM ? 'counterClaimDocuments' : 'defendantDocuments';
  const docs: CcdCollectionItem<CcdUploadedDocument>[] | undefined =
    req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.[documentField];

  if (!Array.isArray(docs) || docs.length === 0) {
    return;
  }

  const token = getUserToken(req);

  const results = await Promise.allSettled(
    docs.map(doc => {
      const url = doc?.value?.document?.document_url;
      if (!url) {
        return Promise.resolve();
      }
      return deleteDocument(url, token);
    })
  );

  const documentTypeLabel = documentType === DocumentType.COUNTER_CLAIM ? 'counter-claim ' : '';
  for (const result of results) {
    if (result.status === 'rejected') {
      logger.warn(`Failed to delete ${documentTypeLabel}document from CDAM`, { reason: result.reason });
    }
  }
}
