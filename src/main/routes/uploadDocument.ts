import { Logger } from '@hmcts/nodejs-logging';
import express, { Request, Response, Router } from 'express';
import fileUpload from 'express-fileupload';

import { DEFAULT_CASE_REFERENCE } from '../config/constants';
import { CaseDocument } from '../interfaces/caseDocument.interface';
import { oidcMiddleware } from '../middleware/oidc';
import { DocumentUploadService } from '../services/documentUploadService';

const logger = Logger.getLogger('uploadDocument');
const router = Router();

// Stage 1: upload document to cdam
router.post(
  '/uploadDocPoc/page2/uploadDocument',
  oidcMiddleware,
  fileUpload({
    limits: { fileSize: 1024 * 1024 * 101 },
  }),
  async (req: Request, res: Response) => {
    try {
      const result = await DocumentUploadService.uploadDocumentToCDAM(req);

      if (result.success) {
        logger.info('[uploadDocument-POC] Stage 1 Complete: CDAM upload successful');
        return res.json(result);
      } else {
        logger.error('[uploadDocument-POC] Stage 1 Failed: CDAM upload error:', result.error);
        return res.status(500).json({
          success: false,
          error: 'Upload to CDAM failed',
          message: result.error,
        });
      }
    } catch (error) {
      logger.error('[uploadDocument-POC] Stage 1: Unexpected error:', error);
      return res.status(500).json({
        success: false,
        error: 'Upload to CDAM failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }
);

// Stage 2: document ref to case in ccd
router.post(
  '/uploadDocPoc/page2/submitDocument',
  oidcMiddleware,
  express.json(),
  async (req: Request, res: Response) => {
    try {
      const { documentReferences, caseReference } = req.body;

      if (!documentReferences || !Array.isArray(documentReferences)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request: documentReferences array required',
        });
      }

      const caseRef = caseReference || DEFAULT_CASE_REFERENCE;

      const user = req.session?.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const result = await DocumentUploadService.submitDocumentToCase(
        user.accessToken,
        documentReferences as CaseDocument[],
        caseRef
      );

      if (result.success) {
        logger.info('[uploadDocument-POC] Stage 2 Complete: CCD association successful');
        return res.json(result);
      } else {
        logger.error('[uploadDocument-POC] Stage 2 Failed: CCD association error:', result.error);
        return res.status(500).json({
          success: false,
          error: 'CCD association failed',
          message: result.error,
        });
      }
    } catch (error) {
      logger.error('[uploadDocument-POC] Stage 2: Unexpected error:', error);
      return res.status(500).json({
        success: false,
        error: 'CCD association failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }
);

export default (app: express.Application): void => {
  app.use(router);
};
