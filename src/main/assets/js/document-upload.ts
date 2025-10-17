/**
 * document upload - 2stage upload process
 * stage 1: upload to cdam
 * stage 2: submit to ccd associate to case
 */

import { CaseDocument } from '../../interfaces/caseDocument.interface';

interface UploadResponse {
  success: boolean;
  documents?: {
    originalDocumentName: string;
    description?: string;
    _links: {
      self: { href: string };
      binary: { href: string };
    };
  }[];
  document?: {
    originalDocumentName: string;
  };
  documentId?: string;
  message?: string;
}

interface SubmitResponse {
  success: boolean;
  caseReference?: string;
  message?: string;
}

export function initDocumentUpload(): void {
  const uploadButton = document.getElementById('uploadButton');
  const submitForm = document.getElementById('submitForm');

  if (!uploadButton || !submitForm) {
    return;
  }

  // store document references from Stage 1
  let documentReferences: CaseDocument[] = [];

  // stage 1: Upload to cdam
  uploadButton.addEventListener('click', async (e: Event) => {
    e.preventDefault();

    const form = document.getElementById('uploadForm') as HTMLFormElement;
    const formData = new FormData(form);
    const uploadError = document.getElementById('upload-error') as HTMLElement;

    uploadError.style.display = 'none';

    try {
      const response = await fetch('/uploadDocPoc/page2/uploadDocument', {
        method: 'POST',
        body: formData,
      });

      const result: UploadResponse = await response.json();

      if (result.success && result.documents) {
        // transform documents to CaseDocument format for storage
        documentReferences = result.documents.map(doc => {
          const documentId = doc._links.self.href.split('/').pop() || '';
          return {
            id: documentId,
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
        });

        // show document info
        const documentNameEl = document.getElementById('document-name');
        const documentIdEl = document.getElementById('document-id');

        if (documentNameEl && result.document) {
          documentNameEl.textContent = result.document.originalDocumentName;
        }
        if (documentIdEl && result.documentId) {
          documentIdEl.textContent = result.documentId;
        }

        // hide upload form, show continue button
        const uploadStage = document.getElementById('upload-stage');
        const continueStage = document.getElementById('continue-stage');

        if (uploadStage) {uploadStage.style.display = 'none';}
        if (continueStage) {continueStage.style.display = 'block';}
      } else {
        const errorMessageEl = document.getElementById('error-message');
        if (errorMessageEl) {
          errorMessageEl.textContent = result.message || 'Upload failed';
        }
        uploadError.style.display = 'block';
      }
    } catch (error) {
      const errorMessageEl = document.getElementById('error-message');
      if (errorMessageEl) {
        errorMessageEl.textContent = 'Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error');
      }
      uploadError.style.display = 'block';
    }
  });

  // Stage 2: submit to ccd
  submitForm.addEventListener('submit', async (e: Event) => {
    e.preventDefault();

    const uploadError = document.getElementById('upload-error') as HTMLElement;
    uploadError.style.display = 'none';

    const caseReferenceInput = document.querySelector('input[name="caseReference"]') as HTMLInputElement;
    const caseReference = caseReferenceInput ? caseReferenceInput.value : '';

    try {
      const response = await fetch('/uploadDocPoc/page2/submitDocument', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentReferences,
          caseReference,
        }),
      });

      const result: SubmitResponse = await response.json();

      if (result.success) {
        alert('Documents successfully associated with case ' + result.caseReference);
      } else {
        const errorMessageEl = document.getElementById('error-message');
        if (errorMessageEl) {
          errorMessageEl.textContent = result.message || 'Submission failed';
        }
        uploadError.style.display = 'block';
      }
    } catch (error) {
      const errorMessageEl = document.getElementById('error-message');
      if (errorMessageEl) {
        errorMessageEl.textContent = 'Submission failed: ' + (error instanceof Error ? error.message : 'Unknown error');
      }
      uploadError.style.display = 'block';
    }
  });
}
