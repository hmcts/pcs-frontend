import { Logger } from '@hmcts/nodejs-logging';
import express, { Request, Response, Router } from 'express';
import fileUpload from 'express-fileupload';

import { DEFAULT_CASE_REFERENCE } from '../config/constants';
import { oidcMiddleware } from '../middleware/oidc';
import { DocumentUploadService } from '../services/documentUploadService';

const logger = Logger.getLogger('uploadDocument');
const router = Router();

router.post(
  '/uploadDocPoc/page2/upload',
  oidcMiddleware,
  fileUpload({
    limits: { fileSize: 1024 * 1024 * 101 },
  }),
  async (req: Request, res: Response) => {
    try {
      logger.info('[uploadDocument] Starting file upload process');
      logger.info('[uploadDocument] Request body:', JSON.stringify(req.body, null, 2));
      logger.info('[uploadDocument] Files received:', req.files ? Object.keys(req.files) : 'No files');

      const caseReference = req.body.caseReference || DEFAULT_CASE_REFERENCE;

      logger.info('[uploadDocument] Delegating to DocumentUploadService', {
        caseReference,
        userId: req.session?.user?.id,
      });

      const result = await DocumentUploadService.uploadSupportingDocuments(req, caseReference);

      if (result.success) {
        logger.info('[uploadDocument] Upload completed successfully:', result);
        return res.json(result);
      } else {
        logger.error('[uploadDocument] Upload failed:', result.error);
        return res.status(500).json({
          success: false,
          error: 'Upload failed',
          message: result.error,
        });
      }
    } catch (error) {
      logger.error('[uploadDocument] Unexpected error:', error);
      return res.status(500).json({
        success: false,
        error: 'Upload failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }
);

export default (app: express.Application): void => {
  app.use(router);
};
