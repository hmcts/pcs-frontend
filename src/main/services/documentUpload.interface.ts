/**
 * The shape CDAM returns for each document in the upload response.
 * URLs live under _links; filename is originalDocumentName.
 */
export interface CdamRawDocument {
  originalDocumentName: string;
  mimeType: string;
  size: number;
  classification: string;
  _links: {
    self: { href: string };
    binary: { href: string };
  };
}

export interface CdamUploadResponse {
  documents: CdamRawDocument[];
}

/**
 * Normalised document reference stored in CCD draft and passed to the MOJ
 * multi-file upload component via hidden inputs.
 */
export interface CdamDocument {
  document_url: string;
  document_binary_url: string;
  document_filename: string;
  content_type?: string;
  size?: number;
}

export interface UploadedFileItem {
  id: string;
  value: CdamDocument;
}
