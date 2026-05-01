import { RESPOND_TO_CLAIM_DRAFT_EVENT } from '../draftEvent';
import { flowConfig } from '../flow.config';

import { createCcdDraftStorage, toDisplayDocuments } from '@modules/documents/storage';
import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { ACCEPT_ATTRIBUTE_EXTENSIONS, UPLOAD_MAX_FILE_SIZE_MB } from '@utils/documentUploadValidation';

const storage = createCcdDraftStorage({
  event: RESPOND_TO_CLAIM_DRAFT_EVENT,
  getDocs: data => data.possessionClaimResponse?.defendantResponses?.counterClaimDocuments ?? [],
  setDocs: docs => ({ possessionClaimResponse: { defendantResponses: { counterClaimDocuments: docs } } }),
});

export const step: StepDefinition = createFormStep({
  stepName: 'counter-claim',
  journeyFolder: 'respondToClaim',
  documentStorage: storage,
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/counterClaim.njk`,
  fields: [
    {
      name: 'documents',
      type: 'file',
      required: false,
      accept: ACCEPT_ATTRIBUTE_EXTENSIONS,
      maxFileSize: UPLOAD_MAX_FILE_SIZE_MB,
      labelClasses: 'govuk-label--s',
      translationKey: { label: 'uploadLabel' },
    },
  ],
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    heading: 'heading',
    guidanceText: 'guidanceText',
    beforeUploadHeading: 'beforeUploadHeading',
    beforeUploadText: 'beforeUploadText',
    uploadLabel: 'uploadLabel',
    filesAddedHeading: 'filesAddedHeading',
    uploadButton: 'uploadButton',
    deleteButton: 'deleteButton',
  },
  getInitialFormData: async req => ({ documents: toDisplayDocuments(await storage.read(req)) }),
  // No extendGetContent — formBuilder auto-wires uploadUrl/deleteUrl when documentStorage is set.
  // No beforeRedirect — documents are saved to CCD on upload/delete via documentProxy.
});
