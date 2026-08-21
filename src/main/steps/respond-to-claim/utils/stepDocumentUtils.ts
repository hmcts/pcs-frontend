import type { Request } from 'express';

import { Logger } from '../../../modules/logger';

import { ccdCaseService } from '@services/ccdCaseService';
import { findCaseDocumentById } from '@utils/documentUtils';

const logger = Logger.getLogger('stepDocumentUtils');

export interface DocumentInfoResult {
  isDocumentUploaded: boolean;
  documentId?: string;
}

export function extractDocumentIdFromCollections(
  validatedCase: unknown,
  candidateCollections: (unknown[] | undefined | null)[]
): DocumentInfoResult {
  const caseData =
    (validatedCase as { data?: Record<string, unknown> })?.data ?? (validatedCase as Record<string, unknown>) ?? {};

  for (const collection of candidateCollections) {
    for (const item of collection ?? []) {
      if (!item || typeof item !== 'object') {
        continue;
      }
      const rec = item as Record<string, unknown>;
      const val = (rec.value as Record<string, unknown>) ?? rec;
      const docObj = (val.document as Record<string, unknown>) ?? val;

      const url = (docObj.document_url ||
        docObj.document_binary_url ||
        val.document_url ||
        val.document_binary_url ||
        rec.document_url ||
        rec.document_binary_url) as string | undefined;

      const urlId = url ? url.split('/documents/')[1]?.split('/')[0] : undefined;
      const id = (rec.id as string) || (val.id as string) || (docObj.id as string) || urlId;

      if (id) {
        const downloadable = findCaseDocumentById(caseData, id);
        if (downloadable?.binaryUrl) {
          return { isDocumentUploaded: true, documentId: downloadable.id };
        }
      }
    }
  }

  return { isDocumentUploaded: false };
}

export function getNoticeDocumentInfo(validatedCase?: unknown): DocumentInfoResult {
  const caseData =
    (validatedCase as { data?: Record<string, unknown> })?.data ?? (validatedCase as Record<string, unknown>) ?? {};

  return extractDocumentIdFromCollections(validatedCase, [
    (caseData.detailsTab_NoticeDetails as Record<string, unknown> | undefined)?.noticeDocuments as unknown[],
    caseData.notice_Documents as unknown[],
  ]);
}

export function getTenancyDocumentInfo(validatedCase?: unknown): DocumentInfoResult {
  const caseData =
    (validatedCase as { data?: Record<string, unknown> })?.data ?? (validatedCase as Record<string, unknown>) ?? {};

  return extractDocumentIdFromCollections(validatedCase, [
    (caseData.detailsTab_TenancyLicenceDetails as Record<string, unknown> | undefined)
      ?.tenancyLicenceDocuments as unknown[],
    (caseData.detailsTab_OccupationContractLicenceDetails as Record<string, unknown> | undefined)
      ?.documents as unknown[],
  ]);
}

export function getRentStatementDocumentInfo(validatedCase?: unknown): DocumentInfoResult {
  const caseData =
    (validatedCase as { data?: Record<string, unknown> })?.data ?? (validatedCase as Record<string, unknown>) ?? {};

  return extractDocumentIdFromCollections(validatedCase, [
    (caseData.detailsTab_RentArrearsDetails as Record<string, unknown> | undefined)?.rentStatement as unknown[],
    caseData.rentArrears_StatementDocuments as unknown[],
    caseData.rentStatement as unknown[],
  ]);
}

export async function resolveStepDocumentId(
  req: Request,
  getDocInfoFn: (caseObj: unknown) => DocumentInfoResult,
  stepLoggerName: string
): Promise<string> {
  let { isDocumentUploaded, documentId } = getDocInfoFn(req.res?.locals.validatedCase);

  if (!isDocumentUploaded) {
    try {
      const accessToken = req.session?.user?.accessToken;
      const rawCaseReference = req.params?.caseReference;
      const caseReference = Array.isArray(rawCaseReference) ? rawCaseReference[0] : rawCaseReference;
      if (accessToken && caseReference) {
        const fullCase = await ccdCaseService.getCaseById(accessToken, caseReference);
        const fullCaseDocInfo = getDocInfoFn(fullCase);
        if (fullCaseDocInfo.isDocumentUploaded && fullCaseDocInfo.documentId) {
          isDocumentUploaded = true;
          documentId = fullCaseDocInfo.documentId;
        }
      }
    } catch (err) {
      logger.warn(`[${stepLoggerName}] Failed to fetch full case for document lookup`, { error: err });
    }
  }

  return isDocumentUploaded && documentId ? documentId : '';
}
