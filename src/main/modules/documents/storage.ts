import type { Request } from 'express';

import { getUserToken } from '../../steps/utils';

import type { CcdCollectionItem, CcdUploadedDocument } from '@services/ccdCase.interface';
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
  return docs.map((item, index) => ({
    index,
    id: item.id,
    document_filename: item.value.document.document_filename,
    content_type: item.value.contentType,
    size: item.value.size,
  }));
}

function getAtPath<T>(obj: unknown, path: readonly [string, ...string[]]): T | undefined {
  let cursor: unknown = obj;
  for (const key of path) {
    if (cursor === null || cursor === undefined || typeof cursor !== 'object') {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[key];
  }
  return cursor as T | undefined;
}

function setAtPath(path: readonly [string, ...string[]], value: unknown): Record<string, unknown> {
  return path.reduceRight<unknown>((acc, key) => ({ [key]: acc }), value) as Record<string, unknown>;
}

export function ccdDraftDocs(opts: { event: CcdDraftEvent; path: readonly [string, ...string[]] }): DocumentStorage {
  return {
    async read(req: Request): Promise<CcdCollectionItem<CcdUploadedDocument>[]> {
      return getAtPath<CcdCollectionItem<CcdUploadedDocument>[]>(req.res?.locals?.validatedCase, opts.path) ?? [];
    },

    async readFresh(req: Request): Promise<CcdCollectionItem<CcdUploadedDocument>[]> {
      const token = getUserToken(req);
      const caseId = req.params.caseReference as string;
      const fresh = await ccdCaseService.getCaseById(token, caseId, opts.event.id);
      return getAtPath<CcdCollectionItem<CcdUploadedDocument>[]>(fresh.data, opts.path) ?? [];
    },

    async save(req: Request, docs: CcdCollectionItem<CcdUploadedDocument>[]): Promise<void> {
      const token = getUserToken(req);
      const caseId = req.params.caseReference as string;
      await ccdCaseService.updateDraft(opts.event, token, caseId, setAtPath(opts.path, docs));
    },
  };
}
