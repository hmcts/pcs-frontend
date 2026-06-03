import type { Request } from 'express';

import { getUserToken } from '../../utils/userRole';

import { Logger } from '@modules/logger';
import type { CcdCollectionItem, CcdUploadedDocument } from '@services/ccdCase.interface';
import { deleteDocument } from '@services/cdamService';

const logger = Logger.getLogger('purgeCounterClaimDocuments');

// Purge of any previously uploaded counter-claim documents from CDAM.
// Mirrors the per-document delete pattern used by documentProxy.removeDraftDocument.
// CDAM failures are logged but never thrown — the normaliser will still strip the
// metadata from the draft, so the user sees a consistent state.
export async function purgeCounterClaimDocumentsFromCdam(req: Request): Promise<void> {
  const docs: CcdCollectionItem<CcdUploadedDocument>[] | undefined =
    req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.counterClaimDocuments;

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

  for (const result of results) {
    if (result.status === 'rejected') {
      logger.warn('Failed to delete counter-claim document from CDAM', { reason: result.reason });
    }
  }
}
