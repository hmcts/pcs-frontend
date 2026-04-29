import { Application, Request, Response } from 'express';
import multer from 'multer';

import { oidcMiddleware } from '../middleware';

import { Logger } from '@modules/logger';
import type { CcdCollectionItem, CcdUploadedDocument } from '@services/ccdCase.interface';
import { ccdCaseService } from '@services/ccdCaseService';
import { deleteDocument, getDocumentBinary, uploadDocument } from '@services/cdamService';
import type { CdamDocument } from '@services/documentUpload.interface';
import { UPLOAD_MAX_FILE_SIZE_BYTES, validateFileType } from '@utils/documentUploadValidation';

const logger = Logger.getLogger('document-proxy');

export function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void {
  const result = validateFileType(file.mimetype, file.originalname);
  if (result === 'ok') {
    cb(null, true);
    return;
  }
  cb(new Error(result === 'blocked_media' ? 'BLOCKED_MEDIA' : 'INVALID_FILE_TYPE'));
}

const upload = multer({
  limits: { fileSize: UPLOAD_MAX_FILE_SIZE_BYTES },
  fileFilter,
});

function getUserToken(req: Request): string {
  const token = req.session?.user?.accessToken;
  if (!token) {
    throw new Error('User not authenticated');
  }
  return token;
}

type ErrorTranslations = ReturnType<typeof getErrorTranslations>;

function getErrorTranslations(req: Request) {
  const t = req.t;
  return {
    wrongType: t('errors.documentUpload.wrongFileTypeDocStore'),
    tooLarge: t('errors.documentUpload.fileTooLargeDocStore'),
    noFile: t('errors.documentUpload.noFileSelected'),
    uploadFailed: t('errors.documentUpload.uploadFailed'),
    deleteFailed: t('errors.documentUpload.fileDeleteFailed'),
    documentNotFound: t('errors.documentUpload.documentUrlRequired'),
    downloadFailed: t('errors.documentUpload.downloadFailed'),
    uploadSuccess: (filename: string) => t('errors.documentUpload.uploadSuccess', { filename }),
  };
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
  const errors = getErrorTranslations(req);
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({ error: { message: errors.tooLarge } });
    return;
  }
  if (err.message === 'INVALID_FILE_TYPE' || err.message === 'BLOCKED_MEDIA') {
    res.status(400).json({ error: { message: errors.wrongType } });
    return;
  }
  next(err);
}

function getExistingDocuments(req: Request): CcdCollectionItem<CcdUploadedDocument>[] {
  const caseData = req.res?.locals?.validatedCase;
  return caseData?.possessionClaimResponse?.defendantResponses?.defendantDocuments ?? [];
}

// Per-case in-process mutex. Two concurrent uploads/deletes for the same case can
// otherwise race on the read-modify-write of defendantDocuments and silently drop
// entries. The lock serialises only the cheap append-and-save phase; CDAM uploads
// run in parallel outside the lock.
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

async function fetchFreshDocuments(
  caseId: string,
  accessToken: string
): Promise<CcdCollectionItem<CcdUploadedDocument>[]> {
  const fresh = await ccdCaseService.getCaseById(accessToken, caseId);
  return fresh.data?.possessionClaimResponse?.defendantResponses?.defendantDocuments ?? [];
}

async function saveDraftDocuments(req: Request, documents: CcdCollectionItem<CcdUploadedDocument>[]): Promise<void> {
  const caseId = req.params.caseReference as string;
  const accessToken = getUserToken(req);

  await ccdCaseService.updateDraftRespondToClaim(accessToken, caseId, {
    possessionClaimResponse: {
      defendantResponses: {
        defendantDocuments: documents,
      },
    },
  });
}

function toCcdDocument(cdamDoc: CdamDocument): CcdCollectionItem<CcdUploadedDocument> {
  return {
    value: {
      document: {
        document_url: cdamDoc.document_url,
        document_binary_url: cdamDoc.document_binary_url,
        document_filename: cdamDoc.document_filename,
      },
      contentType: cdamDoc.content_type,
      size: cdamDoc.size,
    },
  };
}

async function saveDraftWithNewDocument(req: Request, entry: CcdCollectionItem<CcdUploadedDocument>): Promise<number> {
  const caseId = req.params.caseReference as string;
  const accessToken = getUserToken(req);

  return withCaseLock(caseId, async () => {
    const existing = await fetchFreshDocuments(caseId, accessToken);
    const updated = [...existing, entry];
    await saveDraftDocuments(req, updated);
    return updated.length - 1;
  });
}

async function removeDraftDocument(req: Request, index: number): Promise<'removed' | 'stale'> {
  const caseId = req.params.caseReference as string;
  const accessToken = getUserToken(req);

  return withCaseLock(caseId, async () => {
    const existing = await fetchFreshDocuments(caseId, accessToken);

    if (index < 0 || index >= existing.length) {
      return 'stale';
    }

    const docToDelete = existing[index];
    const updated = existing.filter((_, i) => i !== index);
    await saveDraftDocuments(req, updated);
    await deleteDocument(docToDelete.value.document.document_url, accessToken);
    return 'removed';
  });
}

function buildUploadResponse(errors: ErrorTranslations, cdamDoc: CdamDocument, index: number): Record<string, unknown> {
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
      filename: String(index),
      originalname: filename,
    },
    document: {
      index,
      document_filename: filename,
      size: cdamDoc.size,
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
        const existingDocs = getExistingDocuments(req);
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

        const cdamDoc = await uploadDocument(req.file, getUserToken(req));
        const index = await saveDraftWithNewDocument(req, toCcdDocument(cdamDoc));
        return res.json(buildUploadResponse(errors, cdamDoc, index));
      } catch (error) {
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
      const indexParam = (req.body as Record<string, string>).delete;
      const parsed = Number(indexParam);
      if (Number.isNaN(parsed) || !Number.isInteger(parsed) || parsed < 0) {
        return res.status(404).json({ error: { message: errors.documentNotFound } });
      }

      // Stale-index detection happens inside the lock against fresh CCD data,
      // so a concurrent delete that shifts indices surfaces as 409 (client refreshes)
      // rather than silently deleting the wrong file.
      const result = await removeDraftDocument(req, parsed);
      if (result === 'stale') {
        return res.status(409).json({ error: { message: errors.documentNotFound } });
      }
      return res.json({ success: true });
    } catch (error) {
      logger.error('Failed to delete document from CDAM', {
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(502).json({ error: { message: errors.deleteFailed } });
    }
  });
}
