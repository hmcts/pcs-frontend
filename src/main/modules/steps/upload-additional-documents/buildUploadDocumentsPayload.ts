import type { Request } from 'express';

import {
  confirmIfTheseDocumentsRelateToAnApplicationStep,
  uploadYourDocumentsStep,
} from '../../../steps/case-tasks/upload-additional-documents/flow.config';

import { sessionDocs } from '@modules/documents/storage';
import { getFormData } from '@modules/steps';
import type { CcdCollectionItem, CcdUploadedDocument } from '@services/ccdCase.interface';
import { toCaseReference16 } from '@utils/caseReference';

const CLAIM_OR_COUNTERCLAIM_OPTION = 'claim-or-counterclaim';

const uploadStorage = sessionDocs({ stepName: uploadYourDocumentsStep });

export interface UploadDocumentsSubmitPayload {
  uploadedAdditionalDocuments: CcdCollectionItem<CcdUploadedDocument>[];
  documentUploadDetails?: {
    selectedRelatedApplicationId: string;
  };
}

export async function buildUploadDocumentsPayload(req: Request): Promise<UploadDocumentsSubmitPayload> {
  const uploadedAdditionalDocuments = await uploadStorage.read(req);

  const confirmData = getFormData(req, confirmIfTheseDocumentsRelateToAnApplicationStep);
  const relatedApplicationId = confirmData?.relatedApplicationId as string | undefined;

  const payload: UploadDocumentsSubmitPayload = { uploadedAdditionalDocuments };

  if (relatedApplicationId && relatedApplicationId !== CLAIM_OR_COUNTERCLAIM_OPTION) {
    payload.documentUploadDetails = { selectedRelatedApplicationId: relatedApplicationId };
  }

  return payload;
}

export function clearUploadAdditionalDocumentsSession(req: Request): void {
  const caseRef = toCaseReference16(req.params?.caseReference);
  if (!caseRef) {
    return;
  }

  const caseDocs = req.session.uploadedDocs?.[caseRef];
  if (caseDocs) {
    delete caseDocs[uploadYourDocumentsStep];
    if (Object.keys(caseDocs).length === 0) {
      delete req.session.uploadedDocs![caseRef];
    }
  }

  if (req.session.formData?.[confirmIfTheseDocumentsRelateToAnApplicationStep]) {
    delete req.session.formData[confirmIfTheseDocumentsRelateToAnApplicationStep];
  }
}
