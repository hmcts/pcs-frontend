import config from 'config';
import { Application, Request, Response } from 'express';
import FormData from 'form-data';
import multer, { memoryStorage } from 'multer';

import { oidcMiddleware } from '../middleware';

import type { CdamDocument } from '@interfaces/documentUpload.interface';
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

// All document calls go through pcs-api, which handles S2S token generation before calling CDAM.
function getApiUrl(): string {
  return config.get<string>('api.url');
}

function getUserToken(req: Request): string {
  return req.session?.user?.accessToken || '';
}

// Extracts the UUID from a CDAM document URL:
// e.g. http://cdam.../cases/documents/11111111-1111-1111-1111-111111111111 → 11111111-...
function extractDocumentId(documentUrl: string): string | undefined {
  const match = /\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|$)/i.exec(documentUrl);
  return match?.[1];
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
              error: { message: tooLarge },
            });
          }
          if (err.message === 'INVALID_FILE_TYPE' || err.message === 'BLOCKED_MEDIA') {
            return res.status(400).json({
              error: { message: wrongType },
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
            error: { message: 'No file was uploaded' },
          });
        }

        const caseId = req.params.caseReference;
        // Token comes from the authenticated OIDC session.
        // pcs-api will add the required S2S token before forwarding to CDAM.
        const userToken = getUserToken(req);
        const apiUrl = getApiUrl();

        const formData = new FormData();
        formData.append('files', file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype,
        });
        formData.append('caseTypeId', config.get<string>('ccd.caseTypeId'));
        formData.append('jurisdictionId', 'PCS');

        const response = await http.post<CdamDocument>(
          // Frontend → pcs-api → CDAM. pcs-api generates the S2S token needed by CDAM.
          `${apiUrl}/case/document/upload`,
          formData,
          {
            headers: {
              ...formData.getHeaders(),
              Authorization: `Bearer ${userToken}`,
            },
          }
        );

        const uploadedDoc = response.data;
        if (!uploadedDoc?.document_url) {
          logger.error('pcs-api returned no document in response', { caseId });
          return res.status(502).json({
            error: { message: 'Document service did not return a valid response' },
          });
        }

        const filename = uploadedDoc.document_filename || file.originalname;

        const document: CdamDocument = {
          document_url: uploadedDoc.document_url,
          document_binary_url: uploadedDoc.document_binary_url,
          document_filename: filename,
          content_type: uploadedDoc.content_type ?? file.mimetype,
          size: uploadedDoc.size ?? file.size,
        };

        logger.info('Document uploaded to CDAM', { caseId, filename });

        // MOJ MultiFileUpload JS expects { success: { messageText, messageHtml }, file: { ... } }.
        // file.filename becomes the delete button value — we use document_url so it's sent
        // back on delete, allowing the proxy to forward the correct CDAM URL.
        return res.json({
          success: {
            messageText: `${filename} has been uploaded`,
            messageHtml: `${filename} has been uploaded`,
          },
          file: {
            filename: document.document_url,
            originalname: filename,
          },
          document,
        });
      } catch (error) {
        logger.error('Failed to upload document to CDAM', {
          error: error instanceof Error ? error.message : String(error),
        });
        return res.status(502).json({
          error: { message: 'Failed to upload document' },
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
        // MOJ component sends { delete: <document_url> } — we stored document_url as
        // the delete button value so we can extract the UUID and call pcs-api.
        const documentUrl = (req.body as Record<string, string>).delete || '';
        if (!documentUrl) {
          return res.status(400).json({
            error: { message: 'Document URL is required' },
          });
        }

        const documentId = extractDocumentId(documentUrl);
        if (!documentId) {
          return res.status(400).json({
            error: { message: 'Could not extract document ID from URL' },
          });
        }

        const userToken = getUserToken(req);
        const apiUrl = getApiUrl();

        // Frontend → pcs-api → CDAM. pcs-api generates the S2S token needed by CDAM.
        await http.delete(`${apiUrl}/case/document/${documentId}`, {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        });

        logger.info('Document deleted from CDAM', {
          caseId: req.params.caseReference,
          documentId,
        });

        return res.json({ success: true, documentUrl });
      } catch (error) {
        logger.error('Failed to delete document from CDAM', {
          error: error instanceof Error ? error.message : String(error),
        });
        return res.status(502).json({
          error: { message: 'Failed to delete document' },
        });
      }
    }
  );
}
