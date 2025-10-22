import { Logger } from '@hmcts/nodejs-logging';
import express, { Request, Response, Router } from 'express';
import fileUpload from 'express-fileupload';

import { DEFAULT_CASE_REFERENCE } from '../config/constants';
import { oidcMiddleware } from '../middleware/oidc';
import { DocumentUploadService } from '../services/documentUploadService';
import { validateCaseReference } from '../utils/validation';

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
        // Store document references in session for secure retrieval in Stage 2
        if (!req.session) {
          logger.error('[uploadDocument-POC] Session not initialized');
          return res.status(500).json({
            success: false,
            error: 'Session error',
            message: 'Session not initialized',
          });
        }

        // Transform documents to CaseDocument format and store in session
        const caseDocuments =
          result.documents?.map(doc => {
            const documentId = doc._links.self.href.split('/').pop();
            return {
              id: documentId!,
              value: {
                documentType: 'CUI_DOC_UPLOAD_POC',
                description: doc.description || null,
                document: {
                  document_url: doc._links.self.href,
                  document_filename: doc.originalDocumentName,
                  document_binary_url: doc._links.binary.href,
                },
              },
            };
          }) || [];

        req.session.uploadedDocuments = caseDocuments;

        logger.info('[uploadDocument-POC] Stage 1 Complete: CDAM upload successful', {
          documentCount: caseDocuments.length,
          storedInSession: true,
        });
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
      const { caseReference } = req.body;

      // Retrieve document references from session (trusted source)
      const documentReferences = req.session?.uploadedDocuments;

      if (!documentReferences || !Array.isArray(documentReferences) || documentReferences.length === 0) {
        logger.warn('[uploadDocument-POC] No documents found in session', {
          userId: req.session?.user?.id,
        });
        return res.status(400).json({
          success: false,
          error: 'No documents found. Please upload documents first.',
        });
      }

      const caseRef = caseReference || DEFAULT_CASE_REFERENCE;

      // Validate case reference format to prevent SSRF attacks
      if (!validateCaseReference(caseRef)) {
        logger.warn('[uploadDocument-POC] Invalid case reference format', {
          caseRef,
          userId: req.session?.user?.id,
        });
        return res.status(400).json({
          success: false,
          error: 'Invalid case reference format. Must be a 16-digit numeric string.',
        });
      }

      const user = req.session?.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      logger.info('[uploadDocument-POC] Stage 2: Using documents from session', {
        documentCount: documentReferences.length,
        userId: user.id,
      });

      const result = await DocumentUploadService.submitDocumentToCase(user.accessToken, documentReferences, caseRef);

      if (result.success) {
        // Clear uploaded documents from session after successful submission
        delete req.session.uploadedDocuments;

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
