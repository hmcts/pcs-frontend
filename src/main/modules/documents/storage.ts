import type { Request } from 'express';

import { HTTPError } from '../../HttpError';
import { getUserToken } from '../../steps/utils';

import type { CcdCaseData, CcdCollectionItem, CcdUploadedDocument } from '@services/ccdCase.interface';
import { ccdCaseService } from '@services/ccdCaseService';
import { toCaseReference16 } from '@utils/caseReference';

export interface CcdDraftEvent {
  id: string;
  pageId: string;
}

export interface DisplayDocument {
  index: number;
  id?: string;
  document_filename: string;
  content_type?: string;
  size?: number;
}

export interface DocumentStorage {
  read(req: Request): Promise<CcdCollectionItem<CcdUploadedDocument>[]>;
  readFresh(req: Request): Promise<CcdCollectionItem<CcdUploadedDocument>[]>;
  save(req: Request, docs: CcdCollectionItem<CcdUploadedDocument>[]): Promise<void>;
}

export function toDisplayDocuments(docs: CcdCollectionItem<CcdUploadedDocument>[]): DisplayDocument[] {
  if (!Array.isArray(docs)) {
    return [];
  }

  return docs.map((item, index) => ({
    index,
    id: item.id,
    document_filename: item.value.document.document_filename,
    content_type: item.value.contentType,
    size: item.value.size,
  }));
}

export function createCcdDraftStorage(opts: {
  event: CcdDraftEvent;
  getDocs: (data: CcdCaseData) => CcdCollectionItem<CcdUploadedDocument>[];
  setDocs: (docs: CcdCollectionItem<CcdUploadedDocument>[]) => Record<string, unknown>;
}): DocumentStorage {
  return {
    async read(req: Request): Promise<CcdCollectionItem<CcdUploadedDocument>[]> {
      const data = (req.res?.locals?.validatedCase?.data ?? {}) as CcdCaseData;
      return opts.getDocs(data) ?? [];
    },

    async readFresh(req: Request): Promise<CcdCollectionItem<CcdUploadedDocument>[]> {
      const token = getUserToken(req);
      const caseId = toCaseReference16(req.params.caseReference);
      if (!caseId) {
        throw new HTTPError('Invalid case reference format', 404);
      }
      const fresh = await ccdCaseService.getCaseById(token, caseId, opts.event.id);
      return opts.getDocs((fresh.data ?? {}) as CcdCaseData) ?? [];
    },

    async save(req: Request, docs: CcdCollectionItem<CcdUploadedDocument>[]): Promise<void> {
      const token = getUserToken(req);
      const caseId = toCaseReference16(req.params.caseReference);
      if (!caseId) {
        throw new HTTPError('Invalid case reference format', 404);
      }
      await ccdCaseService.updateDraft(opts.event, token, caseId, opts.setDocs(docs));
    },
  };
}

// Documents live in their own session bucket (not under `formData[step]`) so the
// form-builder POST handler — which replaces `formData[step]` wholesale with the
// submitted body — cannot wipe the upload collection. The bucket is keyed by
// `[caseReference][stepName]` so docs uploaded against one case can never leak
// into another case the same user is also working on.
export function sessionDocs(opts: { stepName: string }): DocumentStorage {
  const readFromSession = (req: Request): CcdCollectionItem<CcdUploadedDocument>[] => {
    const caseRef = toCaseReference16(req.params?.caseReference);
    if (!caseRef) {
      return [];
    }
    const docs = req.session.uploadedDocs?.[caseRef]?.[opts.stepName];
    return Array.isArray(docs) ? (docs as CcdCollectionItem<CcdUploadedDocument>[]) : [];
  };

  return {
    async read(req: Request): Promise<CcdCollectionItem<CcdUploadedDocument>[]> {
      return readFromSession(req);
    },

    async readFresh(req: Request): Promise<CcdCollectionItem<CcdUploadedDocument>[]> {
      await new Promise<void>((resolve, reject) => req.session.reload(err => (err ? reject(err) : resolve())));
      return readFromSession(req);
    },

    async save(req: Request, docs: CcdCollectionItem<CcdUploadedDocument>[]): Promise<void> {
      const caseRef = toCaseReference16(req.params?.caseReference);
      if (!caseRef) {
        throw new HTTPError('Invalid case reference format', 404);
      }
      if (!req.session.uploadedDocs) {
        req.session.uploadedDocs = {};
      }
      if (!req.session.uploadedDocs[caseRef]) {
        req.session.uploadedDocs[caseRef] = {} as Record<string, unknown[]>;
      }
      (req.session.uploadedDocs[caseRef] as Record<string, unknown[]>)[opts.stepName] = docs;
      await new Promise<void>((resolve, reject) => req.session.save(err => (err ? reject(err) : resolve())));
    },
  };
}
