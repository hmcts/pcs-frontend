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
  // cdam to pcs format
  private static getCaseDocuments(documents: DocumentManagementFile[]): CaseDocument[] {
    return documents.map(document => {
      const documentId = document._links.self.href.split('/').pop();
      return {
        id: documentId!,
        value: {
          documentLink: {
            document_url: document._links.self.href,
            document_filename: document.originalDocumentName,
            document_binary_url: document._links.binary.href,
          },
          comment: document.description || null,
        },
      };
    });
  }

  // logging transformed payload for backend
  static async uploadAndSubmitDocument(req: Request, caseReference: string): Promise<UploadResult> {
    logger.info('[DocumentUpload-POC] Starting upload and submit process', {
      caseReference,
      userId: req.session?.user?.id,
    });

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
      const cdamClient = new CaseDocumentManagementClient(caseReference, userDetails);

      // upload to cdam
      const uploadedDocuments = await cdamClient.create({
        files: req.files,
        classification: Classification.Public,
      });

      logger.info('[DocumentUpload-POC] CDAM upload successful', {
        caseReference,
        documents: uploadedDocuments.map(doc => ({
          id: doc._links.self.href.split('/').pop(),
          filename: doc.originalDocumentName,
          size: doc.size,
        })),
      });

      // transform to pcs format
      const supportingDocuments = this.getCaseDocuments(uploadedDocuments);

      // log transformed PCS payload
      const pcsPayload = { supportingDocuments };

      logger.info('[DocumentUpload-POC] Data transformation completed successfully', {
        caseReference,
        documentsUploaded: uploadedDocuments.length,
        transformedPayload: JSON.stringify(pcsPayload, null, 2),
      });

      logger.info('[DocumentUpload-POC] === COMPLETE TRANSFORMED PAYLOAD FOR BACKEND ===', {
        caseReference,
        payloadSummary: {
          supportingDocumentsCount: supportingDocuments.length,
          documentDetails: supportingDocuments.map(doc => ({
            documentId: doc.id,
            filename: doc.value.documentLink.document_filename,
            documentUrl: doc.value.documentLink.document_url,
            binaryUrl: doc.value.documentLink.document_binary_url,
            comment: doc.value.comment,
          })),
        },
        fullPayload: pcsPayload,
      });

      // send to CCD
      logger.info('[DocumentUpload-POC] Starting CCD submission', {
        caseReference,
        documentsCount: supportingDocuments.length,
      });

      const ccdCase = {
        id: caseReference,
        data: {
          supportingDocuments,
        },
      };

      const updatedCase = await ccdCaseService.updateCase(user.accessToken, ccdCase);

      logger.info('[DocumentUpload-POC] CCD submission successful', {
        caseId: updatedCase.id,
        documentsCount: supportingDocuments.length,
      });

      logger.info(
        '[DocumentUpload-POC] Process completed successfully - CDAM upload, PCS transformation, and CCD submission done',
        {
          caseReference,
          status: 'SUCCESS',
          steps: {
            '1_CDAM_Upload': 'COMPLETE',
            '2_PCS_Transformation': 'COMPLETE',
            '3_CCD_Submission': 'COMPLETE',
          },
        }
      );

      return {
        success: true,
        message: 'Document uploaded to CDAM, transformed, and sent to CCD successfully',
        caseReference,
        documents: uploadedDocuments,
        document: uploadedDocuments[0],
        documentId: uploadedDocuments[0]?._links?.self?.href?.split('/').pop(),
      };
    } catch (error) {
      logger.error('[DocumentUpload-POC] Process failed', {
        caseReference,
        error: error.message,
        userId: req.session?.user?.id,
      });

      return {
        success: false,
        error: error.message || 'Upload and submit failed',
      };
    }
  }
}
