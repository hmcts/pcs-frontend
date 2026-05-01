import type { Request } from 'express';

import { getUserToken } from '../../steps/utils';

import type { CcdCaseData, CcdCollectionItem, CcdUploadedDocument } from '@services/ccdCase.interface';
import { ccdCaseService } from '@services/ccdCaseService';

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
      const caseId = req.params.caseReference as string;
      const fresh = await ccdCaseService.getCaseById(token, caseId, opts.event.id);
      return opts.getDocs((fresh.data ?? {}) as CcdCaseData) ?? [];
    },

    async save(req: Request, docs: CcdCollectionItem<CcdUploadedDocument>[]): Promise<void> {
      const token = getUserToken(req);
      const caseId = req.params.caseReference as string;
      await ccdCaseService.updateDraft(opts.event, token, caseId, opts.setDocs(docs));
    },
  };
}

// Documents live in their own session bucket (not under `formData[step]`) so the
// form-builder POST handler — which replaces `formData[step]` wholesale with the
// submitted body — cannot wipe the upload collection.
export function sessionDocs(opts: { stepName: string }): DocumentStorage {
  const readFromSession = (req: Request): CcdCollectionItem<CcdUploadedDocument>[] => {
    const docs = req.session.uploadedDocs?.[opts.stepName];
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
      if (!req.session.uploadedDocs) {
        req.session.uploadedDocs = {};
      }
      req.session.uploadedDocs[opts.stepName] = docs;
      await new Promise<void>((resolve, reject) => req.session.save(err => (err ? reject(err) : resolve())));
    },
  };
}
