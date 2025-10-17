export interface CaseDocument {
  id: string;
  value: {
    documentType: string;
    description: string | null;
    document: {
      document_url: string;
      document_filename: string;
      document_binary_url: string;
    };
  };
}
