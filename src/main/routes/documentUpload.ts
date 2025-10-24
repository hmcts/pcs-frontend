import { Logger } from '@hmcts/nodejs-logging';
import { Application, Request, Response } from 'express';
import type { UploadedFile } from 'express-fileupload';

import { oidcMiddleware } from '../middleware';
import { cdamService } from '../services/cdamService';

const logger = Logger.getLogger('documentUpload');

export default function (app: Application): void {
  // GET /upload-documents - Display upload form
  app.get('/upload-documents', oidcMiddleware, (req: Request, res: Response) => {
    try {
      const uploadedDocuments = req.session.uploadedDocuments || [];

      res.render('upload-documents', {
        uploadedDocuments,
      });
    } catch (error: unknown) {
      logger.error('Error displaying upload form:', error);
      res.status(500).render('error', { message: 'Failed to load upload page' });
    }
  });

  // POST /upload-documents - handle file upload to CDAM
  app.post('/upload-documents', oidcMiddleware, async (req: Request, res: Response) => {
    try {
      // check if files were uploaded
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).render('upload-documents', {
          error: 'No files were uploaded',
          uploadedDocuments: req.session.uploadedDocuments || [],
        });
      }

      // get user info from session
      const user = req.session.user;
      if (!user || !user.accessToken || !user.uid) {
        logger.error('User session missing required auth data');
        return res.status(401).render('error', { message: 'Authentication required' });
      }

      // get uploaded files
      const files = req.files.documents as UploadedFile | UploadedFile[];

      logger.info('Uploading documents to CDAM for user:', user.uid);

      // upload to CDAM
      const cdamResponse = await cdamService.uploadDocuments(files, user.uid as string, user.accessToken);

      logger.info(`Successfully uploaded ${cdamResponse.length} documents to CDAM`);

      // format CDAM response for CCD
      const ccdFormattedDocuments = cdamResponse.map(doc => ({
        id: doc._links?.self?.href?.split('/').pop() || '',
        value: {
          documentLink: {
            document_url: doc._links?.self?.href || '',
            document_filename: doc.originalDocumentName || '',
            document_binary_url: doc._links?.binary?.href || '',
          },
          comment: doc.description || null,
        },
      }));

      logger.info(`Formatted ${ccdFormattedDocuments.length} documents for CCD`);
      logger.info('CCD Formatted Documents:', JSON.stringify(ccdFormattedDocuments, null, 2));

      // store CCD-formatted documents in session
      if (!req.session.uploadedDocuments) {
        req.session.uploadedDocuments = [];
      }
      req.session.uploadedDocuments.push(...ccdFormattedDocuments);

      // save session and redirect to success page
      req.session.save(err => {
        if (err) {
          logger.error('Session save error:', err);
          return res.status(500).render('error', { message: 'Failed to save upload session' });
        }

        res.redirect('/upload-success');
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload documents';
      logger.error('Document upload error:', error);
      res.status(500).render('upload-documents', {
        error: errorMessage,
        uploadedDocuments: req.session.uploadedDocuments || [],
      });
    }
  });

  // GET /upload-success - display success page with uploaded documents
  app.get('/upload-success', oidcMiddleware, (req: Request, res: Response) => {
    try {
      const uploadedDocuments = req.session.uploadedDocuments || [];

      res.render('upload-success', {
        uploadedDocuments,
      });
    } catch (error: unknown) {
      logger.error('Error displaying success page:', error);
      res.status(500).render('error', { message: 'Failed to load success page' });
    }
  });
}
