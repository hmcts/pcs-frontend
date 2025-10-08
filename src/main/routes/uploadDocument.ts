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
      logger.info('[uploadDocument-POC] Starting direct upload and submit process');
      logger.info('[uploadDocument-POC] Request body:', JSON.stringify(req.body, null, 2));
      logger.info('[uploadDocument-POC] Files received:', req.files ? Object.keys(req.files) : 'No files');

      const caseReference = req.body.caseReference || DEFAULT_CASE_REFERENCE;

      logger.info('[uploadDocument-POC] Using direct upload and submit method', {
        caseReference,
        userId: req.session?.user?.id,
      });

      const result = await DocumentUploadService.uploadAndSubmitDocument(req, caseReference);

      if (result.success) {
        logger.info('[uploadDocument-POC] Direct upload and submit completed successfully:', {
          caseReference: result.caseReference,
          documentCount: result.documents?.length || 0,
          message: result.message,
        });
        return res.json(result);
      } else {
        logger.error('[uploadDocument-POC] Direct upload and submit failed:', result.error);
        return res.status(500).json({
          success: false,
          error: 'Upload and submit failed',
          message: result.error,
        });
      }
    } catch (error) {
      logger.error('[uploadDocument-POC] Unexpected error:', error);
      return res.status(500).json({
        success: false,
        error: 'Upload and submit failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }
);

export default (app: express.Application): void => {
  app.use(router);
};
