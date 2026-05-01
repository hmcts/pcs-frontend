import { Application, Request, Response } from 'express';
import multer from 'multer';

import { oidcMiddleware } from '../middleware';

import { Logger } from '@modules/logger';
import type { CcdCollectionItem, CcdUploadedDocument } from '@services/ccdCase.interface';
import { ccdCaseService } from '@services/ccdCaseService';
import { deleteDocument, getDocumentBinary, uploadDocument } from '@services/cdamService';
import type { CdamDocument } from '@services/documentUpload.interface';
import {
  UPLOAD_MAX_FILE_SIZE_BYTES,
  UPLOAD_MAX_FILE_SIZE_MB,
  UPLOAD_MAX_TOTAL_SIZE_BYTES,
  UPLOAD_MAX_TOTAL_SIZE_MB,
  validateFileType,
} from '@utils/documentUploadValidation';

const logger = Logger.getLogger('document-proxy');
const MAKE_AN_APPLICATION_JOURNEY = 'make-an-application';
const UPLOAD_DOCUMENTS_STEP = 'upload-documents-to-support-your-application';

interface StoredUploadDocument {
  document_url: string;
  document_binary_url: string;
  document_filename: string;
  size?: number;
  content_type?: string;
}

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
    tooLarge: t('errors.documentUpload.fileTooLargeDocStore', { maxSize: String(UPLOAD_MAX_FILE_SIZE_MB) }),
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

function getTotalDocumentSizeBytes(docs: StoredUploadDocument[]): number {
  return docs.reduce((total, doc) => total + (doc.size || 0), 0);
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

function getJourney(req: Request): string {
  return (req.params.journey as string) || '';
}

function getDefendantNumberFromCaseData(req: Request): number {
  const caseData = req.res?.locals?.validatedCase?.data as Record<string, unknown> | undefined;
  const rawDefendantNumber = caseData?.defendantNumber;

  if (typeof rawDefendantNumber === 'number' && Number.isInteger(rawDefendantNumber) && rawDefendantNumber > 0) {
    return rawDefendantNumber;
  }

  if (typeof rawDefendantNumber === 'string') {
    const parsed = Number(rawDefendantNumber);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return 1;
}

function addGenAppFilenameSuffix(filename: string, defendantNumber: number): string {
  const suffix = ` (GA1) - Defendant ${defendantNumber}`;
  const lastDotIndex = filename.lastIndexOf('.');
  const hasExtension = lastDotIndex > 0;
  const baseName = hasExtension ? filename.slice(0, lastDotIndex) : filename;
  const extension = hasExtension ? filename.slice(lastDotIndex) : '';

  if (baseName.toLowerCase().endsWith(suffix.toLowerCase())) {
    return filename;
  }

  return `${baseName}${suffix}${extension}`;
}

function getUploadFilename(req: Request, originalFilename: string): string {
  if (getJourney(req) !== MAKE_AN_APPLICATION_JOURNEY) {
    return originalFilename;
  }

  return addGenAppFilenameSuffix(originalFilename, getDefendantNumberFromCaseData(req));
}

function getSessionUploadDocuments(req: Request): StoredUploadDocument[] {
  const formData = (req.session?.formData as Record<string, Record<string, unknown>> | undefined) || {};
  const stepData = (formData[UPLOAD_DOCUMENTS_STEP] as Record<string, unknown> | undefined) || {};
  return (stepData.documents as StoredUploadDocument[] | undefined) || [];
}

function getExistingDocuments(req: Request): StoredUploadDocument[] {
  if (getJourney(req) === MAKE_AN_APPLICATION_JOURNEY) {
    return getSessionUploadDocuments(req);
  }

  const caseData = req.res?.locals?.validatedCase;
  const ccdDocs = caseData?.possessionClaimResponse?.defendantResponses?.defendantDocuments ?? [];
  return ccdDocs.map(item => ({
    document_url: item.value.document.document_url,
    document_binary_url: item.value.document.document_binary_url,
    document_filename: item.value.document.document_filename,
    content_type: item.value.contentType,
    size: item.value.size,
  }));
}

function toCcdDocument(doc: StoredUploadDocument): CcdCollectionItem<CcdUploadedDocument> {
  return {
    value: {
      document: {
        document_url: doc.document_url,
        document_binary_url: doc.document_binary_url,
        document_filename: doc.document_filename,
      },
      contentType: doc.content_type,
      size: doc.size,
    },
  };
}

async function saveDraftDocuments(req: Request, documents: StoredUploadDocument[]): Promise<void> {
  if (getJourney(req) === MAKE_AN_APPLICATION_JOURNEY) {
    if (!req.session) {
      throw new Error('Session not available');
    }
    req.session.formData = req.session.formData || {};
    const existingStepData = (req.session.formData[UPLOAD_DOCUMENTS_STEP] as Record<string, unknown> | undefined) || {};
    req.session.formData[UPLOAD_DOCUMENTS_STEP] = {
      ...existingStepData,
      documents,
    };
    return;
  }

  const caseId = req.params.caseReference as string;
  const accessToken = getUserToken(req);

  await ccdCaseService.updateDraftRespondToClaim(accessToken, caseId, {
    possessionClaimResponse: {
      defendantResponses: {
        defendantDocuments: documents.map(toCcdDocument),
      },
    },
  });
}

function toStoredDocument(cdamDoc: CdamDocument): StoredUploadDocument {
  return {
    document_url: cdamDoc.document_url,
    document_binary_url: cdamDoc.document_binary_url,
    document_filename: cdamDoc.document_filename,
    content_type: cdamDoc.content_type,
    size: cdamDoc.size,
  };
}

async function saveDraftWithNewDocument(req: Request, entry: StoredUploadDocument): Promise<number> {
  const existingDocs = getExistingDocuments(req);
  const updatedDocs = [...existingDocs, entry];
  await saveDraftDocuments(req, updatedDocs);
  return updatedDocs.length - 1;
}

async function removeDraftDocument(req: Request, index: number, existingDocs: StoredUploadDocument[]): Promise<void> {
  const docToDelete = existingDocs[index];
  const documentUrl = docToDelete.document_url;

  // Save draft first (remove reference), then delete from CDAM.
  // If CDAM delete fails, orphaned document in CDAM is harmless.
  // If draft save fails, document reference remains valid.
  const updatedDocs = existingDocs.filter((_, i) => i !== index);
  await saveDraftDocuments(req, updatedDocs);

  const userToken = getUserToken(req);
  await deleteDocument(documentUrl, userToken);
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

function validateDocumentIndex(indexParam: string, docs: StoredUploadDocument[]): number | null {
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
        const { stream, contentType } = await getDocumentBinary(doc.document_binary_url, getUserToken(req));

        const filename = sanitiseFilename(doc.document_filename);
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

        const existingDocs = getExistingDocuments(req);
        const newTotalSize = getTotalDocumentSizeBytes(existingDocs) + req.file.size;
        if (newTotalSize > UPLOAD_MAX_TOTAL_SIZE_BYTES) {
          return res.status(400).json({ error: { message: errors.totalTooLarge } });
        }

        const uploadFilename = getUploadFilename(req, req.file.originalname);
        const cdamDoc = await uploadDocument(req.file, getUserToken(req), uploadFilename);
        const index = await saveDraftWithNewDocument(req, toStoredDocument(cdamDoc));
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
      const existingDocs = getExistingDocuments(req);
      const deleteIndex = validateDocumentIndex((req.body as Record<string, string>).delete, existingDocs);

      if (deleteIndex === null) {
        return res.status(404).json({ error: { message: errors.documentNotFound } });
      }

      await removeDraftDocument(req, deleteIndex, existingDocs);
      return res.json({ success: true });
    } catch (error) {
      logger.error('Failed to delete document from CDAM', {
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(502).json({ error: { message: errors.deleteFailed } });
    }
  });
}
