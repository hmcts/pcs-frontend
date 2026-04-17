import { Application, Request, Response } from 'express';
import multer from 'multer';

import { oidcMiddleware } from '../middleware';

import { Logger } from '@modules/logger';
import { deleteDocument, uploadDocument } from '@services/cdamService';
import { UPLOAD_MAX_FILE_SIZE_BYTES, validateFileType } from '@utils/documentUploadValidation';

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

function getErrorTranslations(req: Request) {
  const t = req.t;
  return {
    wrongType: t('errors.documentUpload.wrongFileTypeDocStore'),
    tooLarge: t('errors.documentUpload.fileTooLargeDocStore'),
    noFile: t('errors.documentUpload.noFileSelected'),
    uploadFailed: t('errors.documentUpload.uploadFailed'),
    deleteFailed: t('errors.documentUpload.fileDeleteFailed'),
    documentUrlRequired: t('errors.documentUpload.documentUrlRequired'),
    uploadSuccess: (filename: string) => t('errors.documentUpload.uploadSuccess', { filename }),
  };
}

export default function documentUploadRoutes(app: Application): void {
  app.post(
    '/case/:caseReference/:journey/:step/upload',
    oidcMiddleware,
    (req: Request, res: Response, next) => {
      upload.single('documents')(req, res, async err => {
        if (err) {
          const errors = getErrorTranslations(req);
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
      const errors = getErrorTranslations(req);
      try {
        if (!req.file) {
          return res.status(400).json({ error: { message: errors.noFile } });
        }

        const userToken = getUserToken(req);
        const document = await uploadDocument(req.file, userToken);

        const successMessage = errors.uploadSuccess(document.document_filename);
        const safeSuccessMessage = errors.uploadSuccess(
          document.document_filename
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
        );
        return res.json({
          success: {
            messageText: successMessage,
            messageHtml: safeSuccessMessage,
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

  app.post('/case/:caseReference/:journey/:step/delete', oidcMiddleware, async (req: Request, res: Response) => {
    const errors = getErrorTranslations(req);
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
  });
}
