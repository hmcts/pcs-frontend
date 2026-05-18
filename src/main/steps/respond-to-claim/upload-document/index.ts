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

// Respond-to-claim-specific document storage. Uses the holistic-save contract:
// every save sends the WHOLE defendant slice (via buildDraftDefendantResponse +
// saveDraftDefendantResponse) so unrelated fields aren't wiped by the BE merger.
//
// Intentionally NOT generalised into createCcdDraftStorage — that shared helper
// must remain journey-agnostic for genapps and other journeys (see PR #1259).
const storage: DocumentStorage = {
  async read(req: Request): Promise<CcdCollectionItem<CcdUploadedDocument>[]> {
    const docs = req.res?.locals.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.defendantDocuments;
    return Array.isArray(docs) ? docs : [];
  },

  async readFresh(req: Request): Promise<CcdCollectionItem<CcdUploadedDocument>[]> {
    const token = getUserToken(req);
    const caseId = toCaseReference16(req.params.caseReference);
    if (!caseId) {
      throw new HTTPError('Invalid case reference format', 404);
    }
    const fresh = await ccdCaseService.getCaseById(token, caseId, RESPOND_TO_CLAIM_DRAFT_EVENT.id);
    const docs = fresh.data?.possessionClaimResponse?.defendantResponses?.defendantDocuments;
    return Array.isArray(docs) ? docs : [];
  },

  async save(req: Request, docs: CcdCollectionItem<CcdUploadedDocument>[]): Promise<void> {
    const response = buildDraftDefendantResponse(req);
    response.defendantResponses.defendantDocuments = docs;
    await saveDraftDefendantResponse(req, response);
  },
};

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'upload-document',
  isAnswered: req =>
    Boolean(
      req.res?.locals.validatedCase?.defendantResponses?.defendantDocuments &&
      req.res?.locals.validatedCase?.defendantResponses.defendantDocuments.length > 0
    ),
  documentStorage: storage,
  stepDir: __dirname,
  customTemplate: `${__dirname}/uploadDocument.njk`,
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
  // No beforeRedirect — documents are saved to CCD via documentProxy on upload/delete (holistic save).
});
