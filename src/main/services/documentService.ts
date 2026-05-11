import type { Readable } from 'stream';

import { HTTPError } from '../HttpError';

import { ccdCaseService } from '@services/ccdCaseService';
import { getDocumentBinary } from '@services/cdamService';

export interface DocumentStreamResult {
  stream: Readable;
  contentType?: string;
  contentLength?: string;
  contentDisposition?: string;
  filename: string;
}

function asHeaderString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (Array.isArray(value) && value.length > 0) {
    return String(value[0]);
  }
  return undefined;
}

export const documentService = {
  async getDocumentStream(accessToken: string, caseReference: string, documentId: string): Promise<DocumentStreamResult> {
    const caseData = await ccdCaseService.getCaseById(accessToken, caseReference);
    const document = caseData.data?.allDocuments?.find(item => item.id === documentId)?.value;
    const filename = document?.document_filename?.trim() || 'document';

    if (!document) {
      throw new HTTPError('Document not found', 404);
    }
    const binaryUrl = document.document_binary_url?.trim();
    if (!binaryUrl) {
      throw new HTTPError('Document not found', 404);
    }

    const binaryResponse = await getDocumentBinary(binaryUrl, accessToken);

    return {
      stream: binaryResponse.stream as Readable,
      contentType: asHeaderString(binaryResponse.contentType),
      contentLength: asHeaderString(binaryResponse.contentLength),
      contentDisposition: asHeaderString(binaryResponse.contentDisposition),
      filename,
    };
  },
};
