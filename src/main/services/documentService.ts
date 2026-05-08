import type { Readable } from 'stream';

import { HTTPError } from '../HttpError';

import { http } from '@modules/http';
import { ccdCaseService } from '@services/ccdCaseService';

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
    const documentBinaryUrl = document?.document_binary_url?.trim();
    const filename = document?.document_filename?.trim() || 'document';

    if (!documentBinaryUrl) {
      throw new HTTPError('Document not found', 404);
    }

    const binaryResponse = await http.get<Readable>(documentBinaryUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: 'stream',
    });

    return {
      stream: binaryResponse.data,
      contentType: asHeaderString(binaryResponse.headers['content-type']),
      contentLength: asHeaderString(binaryResponse.headers['content-length']),
      contentDisposition: asHeaderString(binaryResponse.headers['content-disposition']),
      filename,
    };
  },
};
