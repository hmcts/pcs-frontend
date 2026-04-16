import config from 'config';
import { Application, Request, Response } from 'express';
import FormData from 'form-data';
import multer, { memoryStorage } from 'multer';

import { oidcMiddleware } from '../middleware';

import { http } from '@modules/http';
import { Logger } from '@modules/logger';
import { getTranslationFunction, loadStepNamespace } from '@modules/steps';
import type { CdamDocument, CdamRawDocument, CdamUploadResponse } from '@services/documentUpload.interface';
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

// The http singleton automatically attaches ServiceAuthorization (pcs_frontend S2S token)
// to every request, so CDAM can be called directly from the frontend.
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
        // http singleton adds ServiceAuthorization (S2S) automatically via its interceptor.
        // We additionally pass the user's bearer token so CDAM can authorise the user.
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

        const response = await http.post<CdamUploadResponse>(`${cdamUrl}/cases/documents`, formData, {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${userToken}`,
          },
        });

        logger.info('CDAM raw response:\n%s', JSON.stringify(response.data, null, 2));

        const uploadedDoc: CdamRawDocument | undefined = response.data?.documents?.[0];
        if (!uploadedDoc?._links?.self?.href) {
          logger.error('CDAM returned no document in response', { caseId });
          return res.status(502).json({
            error: { message: 'Document service did not return a valid response' },
          });
        }

        // Map from raw CDAM response shape (_links, originalDocumentName, mimeType)
        // to the normalised CdamDocument shape used by CCD and the MOJ component.
        const filename = uploadedDoc.originalDocumentName || file.originalname;

        const document: CdamDocument = {
          document_url: uploadedDoc._links.self.href,
          document_binary_url: uploadedDoc._links.binary.href,
          document_filename: filename,
          content_type: uploadedDoc.mimeType || file.mimetype,
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
        // MOJ component sends { delete: <document_url> } — we stored the dm-store self-link
        // as the delete value. We need to extract the UUID and route through CDAM.
        const documentUrl = (req.body as Record<string, string>).delete || '';
        if (!documentUrl) {
          return res.status(400).json({
            error: { message: 'Document URL is required' },
          });
        }

        // The stored URL is a dm-store link: .../documents/{uuid}
        // CDAM delete endpoint is: DELETE {cdamUrl}/cases/documents/{uuid}
        const documentId = documentUrl.split('/documents/').pop();
        if (!documentId) {
          return res.status(400).json({
            error: { message: 'Could not extract document ID from URL' },
          });
        }

        const userToken = getUserToken(req);
        const cdamUrl = getCdamUrl();

        // http singleton adds ServiceAuthorization (S2S) automatically.
        await http.delete(`${cdamUrl}/cases/documents/${documentId}`, {
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
