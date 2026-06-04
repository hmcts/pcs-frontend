import { randomUUID } from 'crypto';

import { Application, Request, Response } from 'express';
import multer from 'multer';

import { HTTPError } from '../HttpError';
import { oidcMiddleware } from '../middleware';
import { findStep, getUserVariant } from '../steps';
import { getUserToken } from '../steps/utils';

import type { DocumentStorage } from '@modules/documents/storage';
import { Logger } from '@modules/logger';
import type { CcdCollectionItem, CcdUploadedDocument } from '@services/ccdCase.interface';
import { deleteDocument, getDocumentBinary, uploadDocument } from '@services/cdamService';
import type { CdamDocument } from '@services/documentUpload.interface';
import {
  UPLOAD_MAX_FILE_SIZE_BYTES,
  UPLOAD_MAX_TOTAL_SIZE_BYTES,
  UPLOAD_MAX_TOTAL_SIZE_MB,
  type UploadValidationError,
  type UploadValidationOptions,
  getUploadErrorKey,
  validateUploadedFile,
} from '@utils/documentUploadValidation';

const logger = Logger.getLogger('document-proxy');

/** Thrown from saveDraftWithNewDocument when total draft size would exceed the cap (CDAM doc is deleted first). */
const DOCUMENT_TOTAL_SIZE_EXCEEDED = 'DOCUMENT_TOTAL_SIZE_EXCEEDED';

type RequestWithUploadValidation = Request & { uploadValidation?: UploadValidationOptions };

export class UploadValidationFailure extends Error {
  constructor(public readonly validationError: UploadValidationError) {
    super('UPLOAD_VALIDATION_ERROR');
    this.name = 'UploadValidationFailure';
  }
}

export function fileFilter(req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void {
  const opts = (req as RequestWithUploadValidation).uploadValidation ?? {};
  // Size is unknown at fileFilter time; multer.limits.fileSize enforces the per-file byte cap during streaming.
  const error = validateUploadedFile(
    { originalname: file.originalname, mimetype: file.mimetype, size: 0 },
    { maxFilenameLength: opts.maxFilenameLength }
  );
  if (error) {
    cb(new UploadValidationFailure(error));
    return;
  }
  cb(null, true);
}

const upload = multer({
  limits: { fileSize: UPLOAD_MAX_FILE_SIZE_BYTES },
  fileFilter,
});

type ErrorTranslations = ReturnType<typeof getErrorTranslations>;

function translateValidationError(req: Request, error: UploadValidationError): string {
  const { key, params } = getUploadErrorKey(error);
  return req.t(key, params);
}

function getErrorTranslations(req: Request) {
  const t = req.t;
  return {
    totalTooLarge: t('errors.documentUpload.fileTotalTooLargeDocStore', {
      maxSize: String(UPLOAD_MAX_TOTAL_SIZE_MB),
    }),
    noFile: t('errors.documentUpload.noFileSelected'),
    uploadFailed: t('errors.documentUpload.uploadFailed'),
    deleteFailed: t('errors.documentUpload.fileDeleteFailed'),
    documentNotFound: t('errors.documentUpload.documentUrlRequired'),
    downloadFailed: t('errors.documentUpload.downloadFailed'),
    uploadSuccess: (filename: string) => t('errors.documentUpload.uploadSuccess', { filename }),
  };
}

function getTotalDocumentSizeBytes(docs: CcdCollectionItem<CcdUploadedDocument>[]): number {
  return docs.reduce((total, doc) => total + (doc.value.sizeInBytes || 0), 0);
}

export function handleMulterError(
  err: Error | null | undefined,
  req: Request,
  res: Response,
  next: (err?: unknown) => void
): void {
  if (!err) {
    next();
    return;
  }
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    const message = translateValidationError(req, {
      kind: 'file_too_large',
      maxBytes: UPLOAD_MAX_FILE_SIZE_BYTES,
    });
    res.status(400).json({ error: { message } });
    return;
  }
  if (err instanceof UploadValidationFailure) {
    res.status(400).json({ error: { message: translateValidationError(req, err.validationError) } });
    return;
  }
  next(err);
}

function uploadCtx(req: Request): { storage: DocumentStorage } {
  const slug = req.params.journey as string | undefined;
  const stepName = req.params.step as string | undefined;
  const variant = getUserVariant(req);
  const step = slug && stepName ? findStep(slug, stepName, variant) : undefined;
  if (!step?.documentStorage) {
    logger.warn('Upload requested without documentStorage', { slug, stepName, variant });
    throw new HTTPError('Not found', 404);
  }
  return { storage: step.documentStorage };
}

// Per-case in-process mutex. Two concurrent uploads/deletes for the same case
// can otherwise race on the read-modify-write of the documents collection and
// silently drop entries. The lock serialises only the cheap append-and-save
// phase; CDAM uploads run in parallel outside the lock.
const caseLocks = new Map<string, Promise<void>>();

async function withCaseLock<T>(caseId: string, fn: () => Promise<T>): Promise<T> {
  const previous = caseLocks.get(caseId) ?? Promise.resolve();
  let release!: () => void;
  const myTail = previous.then(() => new Promise<void>(resolve => (release = resolve)));
  caseLocks.set(caseId, myTail);
  try {
    await previous;
    return await fn();
  } finally {
    release();
    if (caseLocks.get(caseId) === myTail) {
      caseLocks.delete(caseId);
    }
  }
}

async function saveDraftWithNewDocument(req: Request, entry: CcdCollectionItem<CcdUploadedDocument>): Promise<number> {
  const caseId = req.params.caseReference as string;
  const { storage } = uploadCtx(req);
  const token = getUserToken(req);

  return withCaseLock(caseId, async () => {
    const existing = await storage.readFresh(req);
    const newTotalSize = getTotalDocumentSizeBytes(existing) + (entry.value.sizeInBytes ?? 0);
    if (newTotalSize > UPLOAD_MAX_TOTAL_SIZE_BYTES) {
      try {
        await deleteDocument(entry.value.document.document_url, token);
      } catch (deleteErr) {
        logger.error('Failed to delete CDAM document after total-size cap rejection', {
          error: deleteErr instanceof Error ? deleteErr.message : String(deleteErr),
        });
      }
      throw new HTTPError(DOCUMENT_TOTAL_SIZE_EXCEEDED, 400);
    }
    const updated = [...existing, entry];
    await storage.save(req, updated);
    return updated.length - 1;
  });
}

async function removeDraftDocument(req: Request, docId: string): Promise<'removed' | 'stale'> {
  const caseId = req.params.caseReference as string;
  const { storage } = uploadCtx(req);

  return withCaseLock(caseId, async () => {
    const existing = await storage.readFresh(req);
    const docToDelete = existing.find(d => d.id === docId);
    if (!docToDelete) {
      return 'stale';
    }
    const updated = existing.filter(d => d.id !== docId);
    await storage.save(req, updated);
    await deleteDocument(docToDelete.value.document.document_url, getUserToken(req));
    return 'removed';
  });
}

// Generate the collection-item id on the frontend. CCD treats collection items
// with stable ids as "existing" (preserved across draft round-trips); items
// without ids are treated as new each round-trip and can be lost/duplicated by
// the backend's merge logic. This matches the original fileUpload.ts behaviour
// that was dropped during the BFF proxy refactor.
function cdamToCcdDocument(cdamDoc: CdamDocument): CcdCollectionItem<CcdUploadedDocument> {
  return {
    id: randomUUID(),
    value: {
      document: {
        document_url: cdamDoc.document_url,
        document_binary_url: cdamDoc.document_binary_url,
        document_filename: cdamDoc.document_filename,
      },
      contentType: cdamDoc.content_type,
      sizeInBytes: cdamDoc.size,
    },
  };
}

function buildUploadResponse(
  errors: ErrorTranslations,
  cdamDoc: CdamDocument,
  docId: string,
  index: number
): Record<string, unknown> {
  const filename = cdamDoc.document_filename;
  const safeFilename = filename
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  return {
    success: {
      messageText: errors.uploadSuccess(filename),
      messageHtml: errors.uploadSuccess(safeFilename),
    },
    file: {
      // MOJ multi-file-upload uses this as the delete button's value attribute.
      // Send the stable CCD collection id so deletes are idempotent and order-independent.
      filename: docId,
      originalname: filename,
    },
    document: {
      index,
      id: docId,
      document_filename: filename,
      sizeInBytes: cdamDoc.size,
      content_type: cdamDoc.content_type,
    },
  };
}

function sanitiseFilename(filename: string): string {
  return filename.replace(/["\\\n\r]/g, '_');
}

function validateDocumentIndex(indexParam: string, docs: CcdCollectionItem<CcdUploadedDocument>[]): number | null {
  const docIndex = Number(indexParam);
  if (Number.isNaN(docIndex) || !Number.isInteger(docIndex) || docIndex < 0 || docIndex >= docs.length) {
    return null;
  }
  return docIndex;
}

export default function documentProxyRoutes(app: Application): void {
  // Document download proxy - browser requests by CCD field index, Express streams from CDAM
  app.get(
    '/case/:caseReference/:journey/:step/document/:index',
    oidcMiddleware,
    async (req: Request, res: Response) => {
      const errors = getErrorTranslations(req);
      try {
        const existingDocs = await uploadCtx(req).storage.read(req);
        const docIndex = validateDocumentIndex(req.params.index as string, existingDocs);
        if (docIndex === null) {
          return res.status(404).json({ error: { message: errors.documentNotFound } });
        }

        const doc = existingDocs[docIndex];
        const { stream, contentType } = await getDocumentBinary(
          doc.value.document.document_binary_url,
          getUserToken(req)
        );

        const filename = sanitiseFilename(doc.value.document.document_filename);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Security-Policy', 'sandbox');
        res.setHeader('X-Content-Type-Options', 'nosniff');

        stream.on('error', (err: Error) => {
          logger.error('Stream error while proxying document', { error: err.message });
          if (!res.headersSent) {
            res.status(502).json({ error: { message: errors.downloadFailed } });
          }
        });

        stream.pipe(res);
      } catch (error) {
        if (error instanceof HTTPError && error.status === 404) {
          return res.status(404).json({ error: { message: errors.documentNotFound } });
        }
        logger.error('Failed to proxy document from CDAM', {
          error: error instanceof Error ? error.message : String(error),
        });
        return res.status(502).json({ error: { message: errors.downloadFailed } });
      }
    }
  );

  app.post(
    '/case/:caseReference/:journey/:step/upload',
    oidcMiddleware,
    (req: Request, res: Response, next) => {
      upload.single('documents')(req, res, async err => {
        handleMulterError(err, req, res, next);
      });
    },
    async (req: Request, res: Response) => {
      const errors = getErrorTranslations(req);
      try {
        if (!req.file) {
          return res.status(400).json({ error: { message: errors.noFile } });
        }

        uploadCtx(req);
        const cdamDoc = await uploadDocument(req.file, getUserToken(req));
        const entry = cdamToCcdDocument(cdamDoc);
        const index = await saveDraftWithNewDocument(req, entry);
        return res.json(buildUploadResponse(errors, cdamDoc, entry.id as string, index));
      } catch (error) {
        if (error instanceof HTTPError && error.status === 404) {
          return res.status(404).json({ error: { message: errors.documentNotFound } });
        }
        if (error instanceof HTTPError && error.status === 400 && error.message === DOCUMENT_TOTAL_SIZE_EXCEEDED) {
          return res.status(400).json({ error: { message: errors.totalTooLarge } });
        }
        logger.error('Failed to upload document to CDAM', {
          error: error instanceof Error ? error.message : String(error),
        });
        return res.status(502).json({ error: { message: errors.uploadFailed } });
      }
    }
  );

  app.post('/case/:caseReference/:journey/:step/delete', oidcMiddleware, async (req: Request, res: Response) => {
    const errors = getErrorTranslations(req);
    try {
      const docId = (req.body as Record<string, string>).delete;
      if (typeof docId !== 'string' || docId.length === 0) {
        return res.status(404).json({ error: { message: errors.documentNotFound } });
      }

      // Delete is idempotent: a missing doc means it's already gone (concurrent
      // delete from another tab/click). Treat as success so the client converges.
      await removeDraftDocument(req, docId);
      return res.json({ success: true });
    } catch (error) {
      if (error instanceof HTTPError && error.status === 404) {
        return res.status(404).json({ error: { message: errors.documentNotFound } });
      }
      logger.error('Failed to delete document from CDAM', {
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(502).json({ error: { message: errors.deleteFailed } });
    }
  });
}
