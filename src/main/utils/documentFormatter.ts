import type { CaseDocument, DocumentManagementFile } from '../../types/global';

/**
 * Formats CDAM document response to CCD CaseDocument structure
 * @param cdamDocuments - Documents returned from CDAM upload
 * @returns Array of CCD-formatted documents ready for submission
 */
export function formatCdamForCcd(cdamDocuments: DocumentManagementFile[]): CaseDocument[] {
  return cdamDocuments.map(doc => {
    // Extract document ID from CDAM self link URL
    const documentId = doc._links?.self?.href?.split('/').pop() || '';

    return {
      id: documentId,
      value: {
        documentLink: {
          document_url: doc._links?.self?.href || '',
          document_filename: doc.originalDocumentName || '',
          document_binary_url: doc._links?.binary?.href || '',
        },
        comment: doc.description || null,
      },
    };
  });
}
