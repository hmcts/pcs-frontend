export interface CdamDocument {
  document_url: string;
  document_binary_url: string;
  document_filename: string;
  content_type?: string;
  size?: number;
}

export interface CdamUploadResponse {
  documents: CdamDocument[];
}

export interface UploadedFileItem {
  id: string;
  value: CdamDocument;
}
