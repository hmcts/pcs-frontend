import { Logger } from '@hmcts/nodejs-logging';
import { Request } from 'express';

import { CaseDocumentManagementClient } from '../app/document/CaseDocumentManagementClient';
import { CaseDocument } from '../interfaces/caseDocument.interface';
import { Classification, DocumentManagementFile } from '../interfaces/documentManagement.interface';

import { ccdCaseService } from './ccdCaseService';

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
  // Stage 1: Upload to CDAM
  static async uploadDocumentToCDAM(req: Request): Promise<UploadResult> {
    logger.info('[DocumentUpload-POC] Starting Stage 1: Upload to CDAM only');

    try {
      const user = req.session?.user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (!req.files || Object.keys(req.files).length === 0) {
        throw new Error('No files uploaded');
      }

      // create cdam client
      const userDetails = {
        accessToken: user.accessToken,
        id: String(user.sub || user.uid || user.id || 'unknown'),
        email: user.email,
      };
      const cdamClient = new CaseDocumentManagementClient(userDetails);

      // upload to cdam
      const uploadedDocuments = await cdamClient.create({
        files: req.files,
        classification: Classification.Public,
      });

      logger.info('[DocumentUpload-POC] Stage 1 Complete: CDAM upload successful', {
        documentsCount: uploadedDocuments.length,
        documents: uploadedDocuments.map(doc => ({
          id: doc._links.self.href.split('/').pop(),
          filename: doc.originalDocumentName,
          size: doc.size,
        })),
      });

      // transform to pcs format
      const supportingDocuments = this.getCaseDocuments(uploadedDocuments);

      logger.info('[DocumentUpload-POC] Document references prepared for client', {
        documentsCount: supportingDocuments.length,
      });

      return {
        success: true,
        message: 'Documents uploaded to CDAM successfully',
        documents: uploadedDocuments,
        document: uploadedDocuments[0],
        documentId: uploadedDocuments[0]?._links?.self?.href?.split('/').pop(),
      };
    } catch (error) {
      logger.error('[DocumentUpload-POC] Stage 1 failed - CDAM upload error', {
        error: error.message,
        userId: req.session?.user?.id,
      });

      return {
        success: false,
        error: error.message || 'Upload to CDAM failed',
      };
    }
  }

  // Stage 2: associate documents with case ref
  static async submitDocumentToCase(
    userToken: string,
    documentReferences: CaseDocument[],
    caseReference: string
  ): Promise<UploadResult> {
    logger.info('[DocumentUpload-POC] Starting Stage 2: Associate documents with case', {
      caseReference,
      documentsCount: documentReferences.length,
    });

    try {
      const pcsPayload = { supportingDocuments: documentReferences };

      logger.info('[DocumentUpload-POC] CCD Submission Payload', {
        caseReference,
        payload: pcsPayload,
      });

      // send to CCD
      const ccdCase = {
        id: caseReference,
        data: {
          supportingDocuments: documentReferences,
        },
      };

      const updatedCase = await ccdCaseService.updateCase(userToken, ccdCase);

      logger.info('[DocumentUpload-POC] Stage 2 Complete: CCD submission successful', {
        caseId: updatedCase.id,
        documentsCount: documentReferences.length,
      });

      logger.info('[DocumentUpload-POC] Two-stage process completed successfully', {
        caseReference,
        status: 'SUCCESS',
        steps: {
          '1_CDAM_Upload': 'COMPLETE',
          '2_CCD_Association': 'COMPLETE',
        },
      });

      return {
        success: true,
        message: 'Documents associated with case successfully',
        caseReference,
      };
    } catch (error) {
      logger.error('[DocumentUpload-POC] Stage 2 failed - CCD association error', {
        caseReference,
        error: error.message,
      });

      return {
        success: false,
        error: error.message || 'CCD association failed',
      };
    }
  }

  // cdam to pcs format
  private static getCaseDocuments(documents: DocumentManagementFile[]): CaseDocument[] {
    return documents.map(document => {
      const documentId = document._links.self.href.split('/').pop();
      return {
        id: documentId!,
        value: {
          documentType: 'CUI_DOC_UPLOAD_POC',
          description: document.description || null,
          document: {
            document_url: document._links.self.href,
            document_filename: document.originalDocumentName,
            document_binary_url: document._links.binary.href,
          },
        },
      };
    });
  }
}
