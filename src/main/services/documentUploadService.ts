import { Logger } from '@hmcts/nodejs-logging';
import { Request } from 'express';

import { CaseDocumentManagementClient, Classification , DocumentManagementFile } from '../app/document/CaseDocumentManagementClient';

const logger = Logger.getLogger('DocumentUploadService');


export interface UploadResult {
  success: boolean;
  documents?: DocumentManagementFile[];
  document?: DocumentManagementFile;
  documentId?: string;
  caseReference?: string;
  message?: string;
  error?: string;
}

export class DocumentUploadService {
  /**
   * req Express request object containing files and user session
   * caseReference Case reference to associate documents with
   */
  static async uploadSupportingDocuments(req: Request, caseReference: string): Promise<UploadResult> {
    logger.info('Starting document upload process', {
      caseReference,
      userId: req.session?.user?.id,
      fileCount: Object.keys(req.files || {}).length,
    });

    try {
      const user = req.session?.user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (!req.files || Object.keys(req.files).length === 0) {
        throw new Error('No files uploaded');
      }

      // Create CDAM client - map user properties to match UserDetails interface
      const userDetails = {
        accessToken: user.accessToken,
        id: String(user.sub || user.uid || user.id || 'unknown'),
        email: user.email,
      };
      const cdamClient = new CaseDocumentManagementClient(caseReference, userDetails);

      logger.info('Created CDAM client for case reference:', caseReference);

      // classification and upload
      const uploadedDocuments = await cdamClient.create({
        files: req.files,
        classification: Classification.Public,
      });

      logger.info('Document upload successful', {
        caseReference,
        documentCount: uploadedDocuments.length,
        documents: uploadedDocuments.map(doc => ({
          originalName: doc.originalDocumentName,
          size: doc.size,
          mimeType: doc.mimeType,
          createdOn: doc.createdOn,
          selfHref: doc._links.self.href,
        })),
      });

      return {
        success: true,
        message: 'Document uploaded successfully',
        caseReference,
        documents: uploadedDocuments,
        document: uploadedDocuments[0],
        documentId: uploadedDocuments[0]?._links?.self?.href?.split('/').pop(),
      };
    } catch (error) {
      logger.error('Document upload failed', {
        caseReference,
        error: error.message,
        stack: error.stack,
        userId: req.session?.user?.id,
      });

      return {
        success: false,
        error: error.message || 'Unknown upload error',
      };
    }
  }
}
