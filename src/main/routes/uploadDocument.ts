import express, { Request, Response, Router } from 'express';
import fileUpload from 'express-fileupload';

import { DEFAULT_CASE_REFERENCE } from '../config/constants';
import { CaseDocument } from '../interfaces/caseDocument.interface';
import { oidcMiddleware } from '../middleware/oidc';
import { DocumentUploadService } from '../services/documentUploadService';

import { handleRouteError, handleServiceResult } from './uploadDocumentHelpers';

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
      return handleServiceResult(res, result, 'Stage 1', 'CDAM upload');
    } catch (error) {
      return handleRouteError(res, error, 'Stage 1', 'Upload to CDAM');
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

      return handleServiceResult(res, result, 'Stage 2', 'CCD association');
    } catch (error) {
      return handleRouteError(res, error, 'Stage 2', 'CCD association');
    }
  }
);

export default (app: express.Application): void => {
  app.use(router);
};
