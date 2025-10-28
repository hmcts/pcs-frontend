import { Logger } from '@hmcts/nodejs-logging';
import { Application, Request, Response } from 'express';
import type { UploadedFile } from 'express-fileupload';

import { oidcMiddleware } from '../middleware';
import { ccdCaseService } from '../services/ccdCaseService';
import { cdamService } from '../services/cdamService';
import { CASE_ID } from '../utils/caseIdValidator';
import {
  getUploadedDocuments,
  handleRouteError,
  saveSessionAndRedirect,
  validateUserAuth,
} from '../utils/documentUploadHelpers';

const logger = Logger.getLogger('documentUpload');

export default function (app: Application): void {
  // GET /upload-documents - Display upload form
  app.get('/upload-documents', oidcMiddleware, (req: Request, res: Response) => {
    try {
      const uploadedDocuments = getUploadedDocuments(req);

      res.render('upload-documents', {
        uploadedDocuments,
      });
    } catch (error: unknown) {
      handleRouteError(error, res, 'load upload page');
    }
  });

  // POST /upload-documents - handle file upload to CDAM
  app.post('/upload-documents', oidcMiddleware, async (req: Request, res: Response) => {
    try {
      // check if files were uploaded
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).render('upload-documents', {
          error: 'No files were uploaded',
          uploadedDocuments: getUploadedDocuments(req),
        });
      }

      // get user info from session
      const user = validateUserAuth(req, res);
      if (!user || !user.uid) {
        return;
      }

      // get uploaded files
      const files = req.files.documents as UploadedFile | UploadedFile[];

      // upload to CDAM
      const cdamResponse = await cdamService.uploadDocuments(files, user.uid as string, user.accessToken);

      // format CDAM response for CCD
      const ccdFormattedDocuments = cdamResponse.map(doc => ({
        id: doc._links?.self?.href?.split('/').pop() || '',
        value: {
          documentType: 'LETTER_FROM_CLAIMANT',
          document: {
            document_url: doc._links?.self?.href || '',
            document_filename: doc.originalDocumentName || '',
            document_binary_url: doc._links?.binary?.href || '',
          },
          description: doc.description || null,
        },
      }));

      logger.info('CCD Formatted Documents:', JSON.stringify(ccdFormattedDocuments, null, 2));

      // store CCD-formatted documents in session
      if (!req.session.uploadedDocuments) {
        req.session.uploadedDocuments = [];
      }
      req.session.uploadedDocuments.push(...ccdFormattedDocuments);

      // save session and redirect to success page
      saveSessionAndRedirect(req, res, '/upload-success', 'Failed to save upload session');
    } catch (error: unknown) {
      handleRouteError(error, res, 'upload documents', 'upload-documents', {
        uploadedDocuments: getUploadedDocuments(req),
      });
    }
  });

  // GET /upload-success - display success page with uploaded documents
  app.get('/upload-success', oidcMiddleware, (req: Request, res: Response) => {
    try {
      const uploadedDocuments = getUploadedDocuments(req);

      res.render('upload-success', {
        uploadedDocuments,
      });
    } catch (error: unknown) {
      handleRouteError(error, res, 'load success page');
    }
  });

  // POST /submit-to-ccd - submit documents to CCD
  app.post('/submit-to-ccd', oidcMiddleware, async (req: Request, res: Response) => {
    try {
      // Get user info from session
      const user = validateUserAuth(req, res);
      if (!user) {
        return;
      }

      // Get documents from session (already formatted for CCD)
      const documentsToSubmit = getUploadedDocuments(req);

      if (documentsToSubmit.length === 0) {
        return res.status(400).render('upload-success', {
          error: 'No documents to submit',
          uploadedDocuments: documentsToSubmit,
        });
      }

      // Send to CCD
      await ccdCaseService.updateCaseDocuments(user.accessToken, CASE_ID, documentsToSubmit);

      // Clear uploaded documents from session since they're now in CCD
      req.session.uploadedDocuments = [];

      // Redirect to CCD success page
      saveSessionAndRedirect(req, res, '/ccd-success');
    } catch (error: unknown) {
      // Show error on the same page
      handleRouteError(error, res, 'submit documents to CCD', 'upload-success', {
        uploadedDocuments: getUploadedDocuments(req),
      });
    }
  });

  // GET /ccd-success - display CCD submission success page
  app.get('/ccd-success', oidcMiddleware, (req: Request, res: Response) => {
    try {
      res.render('ccd-success');
    } catch (error: unknown) {
      handleRouteError(error, res, 'load CCD success page');
    }
  });
}
