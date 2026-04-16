import { Application, Request, Response } from 'express';
import multer from 'multer';

import { oidcMiddleware } from '../middleware';

import { Logger } from '@modules/logger';
import { getTranslationFunction, loadStepNamespace } from '@modules/steps';
import { deleteDocument, uploadDocument } from '@services/cdamService';
import { UPLOAD_MAX_FILE_SIZE_BYTES, UPLOAD_MAX_FILE_SIZE_MB, validateFileType } from '@utils/documentUploadValidation';

const logger = Logger.getLogger('document-upload');

const upload = multer({
  limits: { fileSize: UPLOAD_MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    const result = validateFileType(file.mimetype, file.originalname);
    if (result === 'ok') {
      cb(null, true);
      return;
    }
    cb(new Error(result === 'blocked_media' ? 'BLOCKED_MEDIA' : 'INVALID_FILE_TYPE'));
  },
});

function getUserToken(req: Request): string {
  return req.session?.user?.accessToken || '';
}

async function getErrorTranslations(req: Request) {
  await loadStepNamespace(req, 'upload-document', 'respondToClaim');
  const t = getTranslationFunction(req, 'upload-document', ['common']);
  return {
    wrongType: t('common:errors.documentUpload.wrongFileTypeDocStore'),
    tooLarge: t('common:errors.documentUpload.fileTooLargeDocStore', { maxSize: String(UPLOAD_MAX_FILE_SIZE_MB) }),
    noFile: t('common:errors.documentUpload.noFileSelected'),
    uploadFailed: t('common:errors.documentUpload.uploadFailed'),
    deleteFailed: t('common:errors.documentUpload.fileDeleteFailed'),
    documentUrlRequired: t('common:errors.documentUpload.documentUrlRequired'),
    uploadSuccess: (filename: string) => t('common:errors.documentUpload.uploadSuccess', { filename }),
  };
}

export default function documentUploadRoutes(app: Application): void {
  app.post(
    '/case/:caseReference/respond-to-claim/upload-document/upload',
    oidcMiddleware,
    (req: Request, res: Response, next) => {
      upload.single('documents')(req, res, async err => {
        if (err) {
          const errors = await getErrorTranslations(req);
          if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: { message: errors.tooLarge } });
          }
          if (err.message === 'INVALID_FILE_TYPE' || err.message === 'BLOCKED_MEDIA') {
            return res.status(400).json({ error: { message: errors.wrongType } });
          }
          return next(err);
        }
        next();
      });
    },
    async (req: Request, res: Response) => {
      const errors = await getErrorTranslations(req);
      try {
        if (!req.file) {
          return res.status(400).json({ error: { message: errors.noFile } });
        }

        const userToken = getUserToken(req);
        const document = await uploadDocument(req.file, userToken);

        const successMessage = errors.uploadSuccess(document.document_filename);
        const safeFilename = document.document_filename
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
        return res.json({
          success: {
            messageText: successMessage,
            messageHtml: `${safeFilename} has been uploaded`,
          },
          file: {
            filename: document.document_url,
            originalname: document.document_filename,
          },
          document,
        });
      } catch (error) {
        logger.error('Failed to upload document to CDAM', {
          error: error instanceof Error ? error.message : String(error),
        });
        return res.status(502).json({ error: { message: errors.uploadFailed } });
      }
    }
  );

  app.post(
    '/case/:caseReference/respond-to-claim/upload-document/delete',
    oidcMiddleware,
    async (req: Request, res: Response) => {
      const errors = await getErrorTranslations(req);
      try {
        const documentUrl = (req.body as Record<string, string>).delete || '';
        if (!documentUrl) {
          return res.status(400).json({ error: { message: errors.documentUrlRequired } });
        }

        const userToken = getUserToken(req);
        await deleteDocument(documentUrl, userToken);

        return res.json({ success: true, documentUrl });
      } catch (error) {
        logger.error('Failed to delete document from CDAM', {
          error: error instanceof Error ? error.message : String(error),
        });
        return res.status(502).json({ error: { message: errors.deleteFailed } });
      }
    }
  );
}
