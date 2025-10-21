import { UploadedFile } from 'express-fileupload';

export interface DocumentManagementFile {
  description?: string;
  size: number;
  mimeType: string;
  originalDocumentName: string;
  modifiedOn: string;
  createdOn: string;
  classification: Classification;
  _links: {
    self: {
      href: string;
    };
    binary: {
      href: string;
    };
    thumbnail?: {
      href: string;
    };
  };
}

export type UploadedFiles = {
  [fieldname: string]: UploadedFile | UploadedFile[];
};

export enum Classification {
  Private = 'PRIVATE',
  Restricted = 'RESTRICTED',
  Public = 'PUBLIC',
}
