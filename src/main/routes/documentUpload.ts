import config from 'config';
import { Application, Request, Response } from 'express';
import FormData from 'form-data';
import multer, { memoryStorage } from 'multer';

import { oidcMiddleware } from '../middleware';

import type { CdamDocument, CdamUploadResponse } from '@interfaces/documentUpload.interface';
import { http } from '@modules/http';
import { Logger } from '@modules/logger';
import { getTranslationFunction, loadStepNamespace } from '@modules/steps';
import {
  UPLOAD_MAX_FILE_SIZE_BYTES,
  UPLOAD_MAX_FILE_SIZE_MB,
  validateUploadFile,
} from '@utils/documentUploadValidation';

const logger = Logger.getLogger('document-upload');

const upload = multer({
  storage: memoryStorage(),
  limits: { fileSize: UPLOAD_MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    const result = validateUploadFile(file.mimetype, file.originalname);
    if (result === 'ok') {
      cb(null, true);
      return;
    }
    cb(new Error(result === 'blocked_media' ? 'BLOCKED_MEDIA' : 'INVALID_FILE_TYPE'));
  },
});

function getCdamUrl(): string {
  return config.get<string>('cdam.url');
}

function getUserToken(req: Request): string {
  return req.session?.user?.accessToken || '';
}

async function uploadErrorMessages(req: Request): Promise<{ wrongType: string; tooLarge: string }> {
  await loadStepNamespace(req, 'upload-document', 'respondToClaim');
  const t = getTranslationFunction(req, 'upload-document', ['common']);
  return {
    wrongType: t('common:errors.documentUpload.wrongFileTypeDocStore'),
    tooLarge: t('common:errors.documentUpload.fileTooLargeDocStore', { maxSize: String(UPLOAD_MAX_FILE_SIZE_MB) }),
  };
}

export default function documentUploadRoutes(app: Application): void {
  app.post(
    // Browser uploads the file to this frontend route first (not directly to CDAM/IDAM).
    '/case/:caseReference/respond-to-claim/upload-document/upload',
    oidcMiddleware,
    (req: Request, res: Response, next) => {
      upload.single('documents')(req, res, async err => {
        if (err) {
          const { wrongType, tooLarge } = await uploadErrorMessages(req);
          if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              error: 'FILE_TOO_LARGE',
              message: tooLarge,
            });
          }
          if (err.message === 'INVALID_FILE_TYPE' || err.message === 'BLOCKED_MEDIA') {
            return res.status(400).json({
              success: false,
              error: err.message === 'BLOCKED_MEDIA' ? 'BLOCKED_MEDIA' : 'INVALID_FILE_TYPE',
              message: wrongType,
            });
          }
          return next(err);
        }
        next();
      });
    },
    async (req: Request, res: Response) => {
      try {
        const file = req.file;
        if (!file) {
          return res.status(400).json({
            success: false,
            error: 'NO_FILE',
            message: 'No file was uploaded',
          });
        }

        const caseId = req.params.caseReference;
        // Token comes from the authenticated OIDC session; used to authorize CDAM API calls.
        const userToken = getUserToken(req);
        const cdamUrl = getCdamUrl();

        const formData = new FormData();
        formData.append('files', file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype,
        });
        formData.append('classification', 'PUBLIC');
        formData.append('caseTypeId', config.get<string>('ccd.caseTypeId'));
        formData.append('jurisdictionId', 'PCS');

        const response = await http.post<CdamUploadResponse>(
          // Frontend-to-CDAM proxy call: file leaves browser -> frontend -> CDAM.
          `${cdamUrl}/cases/documents`,
          formData,
          {
            headers: {
              ...formData.getHeaders(),
              Authorization: `Bearer ${userToken}`,
            },
          }
        );

        const uploadedDoc = response.data?.documents?.[0];
        if (!uploadedDoc) {
          logger.error('CDAM returned no document in response', { caseId });
          return res.status(502).json({
            success: false,
            error: 'UPLOAD_FAILED',
            message: 'Document service did not return a valid response',
          });
        }

        const document: CdamDocument = {
          document_url: uploadedDoc.document_url,
          document_binary_url: uploadedDoc.document_binary_url,
          // Some stubs/environments may return URL fields without document_filename.
          document_filename: uploadedDoc.document_filename || file.originalname,
          content_type: file.mimetype,
          size: file.size,
        };

        logger.info('Document uploaded to CDAM', {
          caseId,
          filename: document.document_filename,
        });

        return res.json({ success: true, document });
      } catch (error) {
        logger.error('Failed to upload document to CDAM', {
          error: error instanceof Error ? error.message : String(error),
        });
        return res.status(502).json({
          success: false,
          error: 'UPLOAD_FAILED',
          message: 'Failed to upload document',
        });
      }
    }
  );

  app.post(
    // Browser asks frontend to delete the document; frontend then calls CDAM using user auth token.
    '/case/:caseReference/respond-to-claim/upload-document/delete',
    oidcMiddleware,
    async (req: Request, res: Response) => {
      try {
        const { documentUrl } = req.body as { documentUrl: string };
        if (!documentUrl) {
          return res.status(400).json({
            success: false,
            error: 'MISSING_URL',
            message: 'Document URL is required',
          });
        }

        const userToken = getUserToken(req);

        await http.delete(documentUrl, {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        });

        logger.info('Document deleted from CDAM', {
          caseId: req.params.caseReference,
          documentUrl,
        });

        return res.json({ success: true });
      } catch (error) {
        logger.error('Failed to delete document from CDAM', {
          error: error instanceof Error ? error.message : String(error),
        });
        return res.status(502).json({
          success: false,
          error: 'DELETE_FAILED',
          message: 'Failed to delete document',
        });
      }
    }
  );
}
