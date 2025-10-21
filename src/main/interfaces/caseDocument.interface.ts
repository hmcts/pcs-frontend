export interface CaseDocument {
  id: string;
  value: {
    documentLink: {
      document_url: string;
      document_filename: string;
      document_binary_url: string;
    };
    comment: string | null;
  };
}

export interface DocumentSubmissionPayload {
  supportingDocuments?: CaseDocument[];
}
