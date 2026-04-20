import { Application, Request, Response } from 'express';
import multer from 'multer';

import { oidcMiddleware } from '../middleware';

import { Logger } from '@modules/logger';
import type { CcdCollectionItem, CcdDefendantDocument } from '@services/ccdCase.interface';
import { ccdCaseService } from '@services/ccdCaseService';
import { deleteDocument, uploadDocument } from '@services/cdamService';
import { UPLOAD_MAX_FILE_SIZE_BYTES, validateFileType } from '@utils/documentUploadValidation';

const logger = Logger.getLogger('document-upload');

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
  return req.session?.user?.accessToken || '';
}

function getErrorTranslations(req: Request) {
  const t = req.t;
  return {
    wrongType: t('errors.documentUpload.wrongFileTypeDocStore'),
    tooLarge: t('errors.documentUpload.fileTooLargeDocStore'),
    noFile: t('errors.documentUpload.noFileSelected'),
    uploadFailed: t('errors.documentUpload.uploadFailed'),
    deleteFailed: t('errors.documentUpload.fileDeleteFailed'),
    documentNotFound: t('errors.documentUpload.documentUrlRequired'),
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

function getExistingDocuments(req: Request): CcdCollectionItem<CcdDefendantDocument>[] {
  const caseData = req.res?.locals?.validatedCase;
  return caseData?.possessionClaimResponse?.defendantResponses?.uploadedDocuments ?? [];
}

async function saveDraftDocuments(req: Request, documents: CcdCollectionItem<CcdDefendantDocument>[]): Promise<void> {
  const caseId = req.params.caseReference as string;
  const accessToken = getUserToken(req);

  await ccdCaseService.updateDraftRespondToClaim(accessToken, caseId, {
    possessionClaimResponse: {
      defendantResponses: {
        uploadedDocuments: documents,
      },
    },
  });
}

export default function documentUploadRoutes(app: Application): void {
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

        const userToken = getUserToken(req);
        const cdamDoc = await uploadDocument(req.file, userToken);

        // Build CCD document entry
        const newEntry: CcdCollectionItem<CcdDefendantDocument> = {
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

        // Append to existing documents and save to CCD draft
        const existingDocs = getExistingDocuments(req);
        const updatedDocs = [...existingDocs, newEntry];
        await saveDraftDocuments(req, updatedDocs);

        const newIndex = updatedDocs.length - 1;
        const filename = cdamDoc.document_filename;
        const safeFilename = filename
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');

        return res.json({
          success: {
            messageText: errors.uploadSuccess(filename),
            messageHtml: errors.uploadSuccess(safeFilename),
          },
          file: {
            filename: String(newIndex),
            originalname: filename,
          },
          document: {
            index: newIndex,
            document_filename: filename,
            size: cdamDoc.size,
            content_type: cdamDoc.content_type,
          },
        });
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
      const deleteIndex = Number((req.body as Record<string, string>).delete);
      if (Number.isNaN(deleteIndex) || deleteIndex < 0) {
        return res.status(400).json({ error: { message: errors.documentNotFound } });
      }

      const existingDocs = getExistingDocuments(req);
      if (deleteIndex >= existingDocs.length) {
        return res.status(404).json({ error: { message: errors.documentNotFound } });
      }

      // Look up the real CDAM URL from CCD data (server-side only)
      const docToDelete = existingDocs[deleteIndex];
      const documentUrl = docToDelete.value.document.document_url;

      const userToken = getUserToken(req);
      await deleteDocument(documentUrl, userToken);

      // Remove from list and save updated draft
      const updatedDocs = existingDocs.filter((_, i) => i !== deleteIndex);
      await saveDraftDocuments(req, updatedDocs);

      return res.json({ success: true });
    } catch (error) {
      logger.error('Failed to delete document from CDAM', {
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(502).json({ error: { message: errors.deleteFailed } });
    }
  });
}
