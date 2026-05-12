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
  sizeInBytes?: number;
}

export interface DocumentStorage {
  read(req: Request): Promise<CcdCollectionItem<CcdUploadedDocument>[]>;
  readFresh(req: Request): Promise<CcdCollectionItem<CcdUploadedDocument>[]>;
  save(req: Request, docs: CcdCollectionItem<CcdUploadedDocument>[]): Promise<void>;
}

export function toDisplayDocuments(docs: CcdCollectionItem<CcdUploadedDocument>[]): DisplayDocument[] {
  return docs.map((item, index) => ({
    index,
    id: item.id,
    document_filename: item.value.document.document_filename,
    content_type: item.value.contentType,
    sizeInBytes: item.value.sizeInBytes,
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
      const fresh = await ccdCaseService.getCaseByIdForEvent(token, caseId, opts.event.id);
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

export function sessionDocs(opts: { stepName: string; fieldName?: string }): DocumentStorage {
  const fieldName = opts.fieldName ?? 'documents';
  return {
    async read(req: Request): Promise<CcdCollectionItem<CcdUploadedDocument>[]> {
      return (
        ((req.session.formData?.[opts.stepName] as Record<string, unknown>)?.[
          fieldName
        ] as CcdCollectionItem<CcdUploadedDocument>[]) ?? []
      );
    },

    async readFresh(req: Request): Promise<CcdCollectionItem<CcdUploadedDocument>[]> {
      await new Promise<void>((resolve, reject) => req.session.reload(err => (err ? reject(err) : resolve())));
      return (
        ((req.session.formData?.[opts.stepName] as Record<string, unknown>)?.[
          fieldName
        ] as CcdCollectionItem<CcdUploadedDocument>[]) ?? []
      );
    },

    async save(req: Request, docs: CcdCollectionItem<CcdUploadedDocument>[]): Promise<void> {
      if (!req.session.formData) {
        req.session.formData = {};
      }
      if (!req.session.formData[opts.stepName]) {
        req.session.formData[opts.stepName] = {};
      }
      (req.session.formData[opts.stepName] as Record<string, unknown>)[fieldName] = docs;
      await new Promise<void>((resolve, reject) => req.session.save(err => (err ? reject(err) : resolve())));
    },
  };
}
