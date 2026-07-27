import { flowConfig } from '../flow.config';

import { sessionDocs, toDisplayDocuments } from '@modules/documents/storage';
import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { CANCEL_UPLOAD_ADDITIONAL_DOCUMENTS_ROUTE } from '@routes/cancelUploadAdditionalDocuments';
import {
  ACCEPT_ATTRIBUTE_EXTENSIONS,
  UPLOAD_MAX_DOCUMENT_FILE_SIZE_BYTES,
  UPLOAD_MAX_DOCUMENT_FILE_SIZE_MB,
  UPLOAD_MAX_FILENAME_LENGTH,
  UPLOAD_MAX_MEDIA_FILE_SIZE_BYTES,
} from '@utils/documentUploadValidation';

const stepName = 'upload-your-documents';

const storage = sessionDocs({ stepName });

export const step: StepDefinition = createFormStep({
  stepName,
  journeyFolder: 'uploadAdditionalDocuments',
  documentStorage: storage,
  uploadValidation: {
    maxFilenameLength: UPLOAD_MAX_FILENAME_LENGTH,
    maxDocumentBytes: UPLOAD_MAX_DOCUMENT_FILE_SIZE_BYTES,
    maxMediaBytes: UPLOAD_MAX_MEDIA_FILE_SIZE_BYTES,
  },
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/uploadYourDocuments.njk`,
  fields: [
    {
      name: 'documents',
      type: 'file',
      required: true,
      accept: ACCEPT_ATTRIBUTE_EXTENSIONS,
      maxFileSize: UPLOAD_MAX_DOCUMENT_FILE_SIZE_MB,
      labelClasses: 'govuk-label--s',
      translationKey: { label: 'uploadLabel' },
    },
  ],
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    guidanceText: 'guidanceText',
    beforeUploadText: 'beforeUploadText',
    fileTypesText: 'fileTypesText',
    uploadLabel: 'uploadLabel',
    filesAddedHeading: 'filesAddedHeading',
    uploadButton: 'uploadButton',
    deleteButton: 'deleteButton',
  },
  getInitialFormData: async req => ({
    documents: toDisplayDocuments(await storage.read(req)),
  }),
  extendGetContent: async req => {
    const caseId = req.res?.locals.validatedCase?.id;
    return {
      cancelUrl: caseId ? CANCEL_UPLOAD_ADDITIONAL_DOCUMENTS_ROUTE.replace(':caseReference', String(caseId)) : '',
    };
  },
});
