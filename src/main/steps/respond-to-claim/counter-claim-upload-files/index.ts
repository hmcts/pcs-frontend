import type { Request } from 'express';

import { HTTPError } from '../../../HttpError';
import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { getUserToken } from '../../utils/userRole';
import { RESPOND_TO_CLAIM_DRAFT_EVENT } from '../draftEvent';
import { createRespondToClaimFormStep } from '../formStep';

import { type DocumentStorage, toDisplayDocuments } from '@modules/documents/storage';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CcdCollectionItem, CcdUploadedDocument } from '@services/ccdCase.interface';
import { ccdCaseService } from '@services/ccdCaseService';
import { toCaseReference16 } from '@utils/caseReference';
import { ACCEPT_ATTRIBUTE_EXTENSIONS, UPLOAD_MAX_FILE_SIZE_MB } from '@utils/documentUploadValidation';

// Holistic save: each upload/delete sends the full defendant slice so CCD does not
// replace defendantResponses with only counterClaimDocuments (wiping siblings).
const storage: DocumentStorage = {
  async read(req: Request): Promise<CcdCollectionItem<CcdUploadedDocument>[]> {
    const docs =
      req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.counterClaimDocuments;
    return Array.isArray(docs) ? docs : [];
  },

  async readFresh(req: Request): Promise<CcdCollectionItem<CcdUploadedDocument>[]> {
    const token = getUserToken(req);
    const caseId = toCaseReference16(req.params.caseReference);
    if (!caseId) {
      throw new HTTPError('Invalid case reference format', 404);
    }
    const fresh = await ccdCaseService.getCaseByIdForEvent(token, caseId, RESPOND_TO_CLAIM_DRAFT_EVENT.id);
    const docs = fresh.data?.possessionClaimResponse?.defendantResponses?.counterClaimDocuments;
    return Array.isArray(docs) ? docs : [];
  },

  async save(req: Request, docs: CcdCollectionItem<CcdUploadedDocument>[]): Promise<void> {
    const response = buildDraftDefendantResponse(req);
    response.defendantResponses.counterClaimDocuments = docs;
    await saveDraftDefendantResponse(req, response);
  },
};

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'counter-claim-upload-files',
  documentStorage: storage,
  stepDir: __dirname,
  customTemplate: `${__dirname}/counterClaimUploadFiles.njk`,
  fields: [
    {
      name: 'documents',
      type: 'file',
      required: false,
      accept: ACCEPT_ATTRIBUTE_EXTENSIONS,
      maxFileSize: UPLOAD_MAX_FILE_SIZE_MB,
      labelClasses: 'govuk-label--s',
      translationKey: { label: 'uploadLabel' },
      validate: (_value, formData) => {
        const uploaded = formData['uploadedDocuments[]'];
        const hasFiles =
          uploaded !== undefined && uploaded !== null && !(Array.isArray(uploaded) && uploaded.length === 0);
        return hasFiles ? undefined : 'errors.documents';
      },
    },
  ],
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    guidanceText: 'guidanceText',
    guidanceText2: 'guidanceText2',
    beforeUploadHeading: 'beforeUploadHeading',
    beforeUploadText: 'beforeUploadText',
    fileTypesText: 'fileTypesText',
    uploadLabel: 'uploadLabel',
    filesAddedHeading: 'filesAddedHeading',
    uploadButton: 'uploadButton',
    deleteButton: 'deleteButton',
  },
  getInitialFormData: async req => ({ documents: toDisplayDocuments(await storage.read(req)) }),
  beforeRedirect: async req => {
    const response = buildDraftDefendantResponse(req);
    await saveDraftDefendantResponse(req, response);
  },
});
