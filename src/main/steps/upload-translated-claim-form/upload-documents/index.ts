import { Request } from 'express';

import { getCaseTitleData } from '../../utils/getCaseTitleData';
import { flowConfig } from '../flow.config';

import { sessionDocs, toDisplayDocuments } from '@modules/documents/storage';
import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { ACCEPT_ATTRIBUTE_EXTENSIONS, UPLOAD_MAX_FILE_SIZE_MB } from '@utils/documentUploadValidation';

const STEP_NAME = 'upload-documents';
const JOURNEY_NAME = 'uploadTranslatedClaimForm';

const uploadStorage = sessionDocs({ stepName: STEP_NAME }); // TODO: Is this OK?

export const step: StepDefinition = createFormStep({
  stepName: STEP_NAME,
  journeyFolder: JOURNEY_NAME,
  documentStorage: uploadStorage,
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/uploadDocuments.njk`,
  fields: [
    {
      name: 'documents',
      type: 'file',
      required: false,
      accept: ACCEPT_ATTRIBUTE_EXTENSIONS,
      maxFileSize: UPLOAD_MAX_FILE_SIZE_MB,
      labelClasses: 'govuk-label--s',
      translationKey: {
        label: 'uploadLabel',
      },
    },
  ],
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    heading: 'heading',
    guidanceText: 'guidanceText',
    beforeUploadText: 'beforeUploadText',
    fileTypesText: 'fileTypesText',
    uploadSubheading: 'uploadSubheading',
    uploadLabel: 'uploadLabel',
    filesAddedHeading: 'filesAddedHeading',
    uploadButton: 'uploadButton',
    deleteButton: 'deleteButton',
  },
  extendGetContent: async (req: Request) => {
    return getCaseTitleData(req);
  },
  getInitialFormData: async req => ({ documents: toDisplayDocuments(await uploadStorage.read(req)) }),
});
