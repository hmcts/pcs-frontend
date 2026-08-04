import type { Request } from 'express';

import { buildUploadDocumentsPayload } from '../../../../../main/modules/steps/upload-additional-documents/buildUploadDocumentsPayload';
import {
  confirmIfTheseDocumentsRelateToAnApplicationStep,
  uploadYourDocumentsStep,
} from '../../../../../main/steps/case-tasks/upload-additional-documents/flow.config';

import type { CcdCollectionItem, CcdUploadedDocument } from '@services/ccdCase.interface';

const CASE_REF = '1234567890123456';

const doc: CcdCollectionItem<CcdUploadedDocument> = {
  id: 'doc-1',
  value: {
    document: {
      document_url: 'http://example/doc',
      document_binary_url: 'http://example/doc/binary',
      document_filename: 'evidence.pdf',
    },
    contentType: 'application/pdf',
    sizeInBytes: 1024,
  },
};

function makeReq(
  overrides: {
    uploadedDocs?: CcdCollectionItem<CcdUploadedDocument>[];
    relatedApplicationId?: string;
  } = {}
): Request {
  const session: Record<string, unknown> = { formData: {} };
  if (overrides.uploadedDocs) {
    session.uploadedDocs = { [CASE_REF]: { [uploadYourDocumentsStep]: overrides.uploadedDocs } };
  }
  if (overrides.relatedApplicationId !== undefined) {
    session.formData = {
      [confirmIfTheseDocumentsRelateToAnApplicationStep]: {
        relatedApplicationId: overrides.relatedApplicationId,
      },
    };
  }

  return {
    params: { caseReference: CASE_REF },
    session,
  } as unknown as Request;
}

describe('buildUploadDocumentsPayload', () => {
  it('returns uploaded documents from session', async () => {
    const result = await buildUploadDocumentsPayload(makeReq({ uploadedDocs: [doc] }));

    expect(result.uploadedAdditionalDocuments).toEqual([doc]);
    expect(result.documentUploadDetails).toBeUndefined();
  });

  it('includes selectedRelatedApplicationId when a gen app is chosen', async () => {
    const genAppId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const result = await buildUploadDocumentsPayload(makeReq({ uploadedDocs: [doc], relatedApplicationId: genAppId }));

    expect(result.documentUploadDetails).toEqual({ selectedRelatedApplicationId: genAppId });
  });

  it('omits documentUploadDetails for claim-or-counterclaim', async () => {
    const result = await buildUploadDocumentsPayload(
      makeReq({ uploadedDocs: [doc], relatedApplicationId: 'claim-or-counterclaim' })
    );

    expect(result.documentUploadDetails).toBeUndefined();
  });

  it('allows empty uploadedAdditionalDocuments', async () => {
    const result = await buildUploadDocumentsPayload(makeReq());

    expect(result.uploadedAdditionalDocuments).toEqual([]);
  });
});
