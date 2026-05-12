import { flowConfig } from '../flow.config';

import { sessionDocs, toDisplayDocuments } from '@modules/documents/storage';
import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { ACCEPT_ATTRIBUTE_EXTENSIONS, UPLOAD_MAX_FILE_SIZE_MB } from '@utils/documentUploadValidation';

const stepName = 'upload-your-documents';

const storage = sessionDocs({ stepName, fieldName: 'documents' });

export const step: StepDefinition = createFormStep({
  stepName,
  journeyFolder: 'uploadAdditionalDocuments',
  documentStorage: storage,
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/uploadYourDocuments.njk`,
  fields: [
    {
      name: 'documents',
      type: 'file',
      required: false,
      accept: ACCEPT_ATTRIBUTE_EXTENSIONS,
      maxFileSize: UPLOAD_MAX_FILE_SIZE_MB,
      labelClasses: 'govuk-label--s',
      translationKey: { label: 'uploadLabel', hint: 'uploadHint' },
    },
  ],
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    guidanceText: 'guidanceText',
    beforeUploadText: 'beforeUploadText',
    fileTypesText: 'fileTypesText',
    uploadLabel: 'uploadLabel',
    uploadHint: 'uploadHint',
    filesAddedHeading: 'filesAddedHeading',
    uploadButton: 'uploadButton',
    deleteButton: 'deleteButton',
  },
  getInitialFormData: async req => ({
    documents: toDisplayDocuments(await storage.read(req)),
  }),
});
