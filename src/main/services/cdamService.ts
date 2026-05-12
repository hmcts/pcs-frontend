import config from 'config';
import FormData from 'form-data';
import type { Readable } from 'stream';

import { CASE_TYPE, CLASSIFICATION, JURISDICTION } from '../constants';
import { HTTPError } from '../HttpError';

import { http } from '@modules/http';
import { Logger } from '@modules/logger';
import { ccdCaseService } from '@services/ccdCaseService';
import type { CdamDocument, CdamRawDocument, CdamUploadResponse } from '@services/documentUpload.interface';

const logger = Logger.getLogger('cdamService');

export interface DocumentStreamResult {
  stream: Readable;
  contentType?: string;
  contentLength?: string;
  contentDisposition?: string;
  filename: string;
}

function getCdamUrl(): string {
  return config.get<string>('cdam.url');
}

export async function uploadDocument(file: Express.Multer.File, userToken: string): Promise<CdamDocument> {
  const cdamUrl = getCdamUrl();

  const formData = new FormData();
  formData.append('files', file.buffer, {
    filename: file.originalname,
    contentType: file.mimetype,
  });
  formData.append('classification', CLASSIFICATION);
  formData.append('caseTypeId', CASE_TYPE);
  formData.append('jurisdictionId', JURISDICTION);

  const response = await http.post<CdamUploadResponse>(`${cdamUrl}/cases/documents`, formData, {
    headers: {
      ...formData.getHeaders(),
      Authorization: `Bearer ${userToken}`,
    },
  });

  const raw: CdamRawDocument | undefined = response.data?.documents?.[0];
  if (!raw?._links?.self?.href) {
    throw new Error('CDAM returned no document in response');
  }

  const filename = raw.originalDocumentName || file.originalname;

  logger.info('Document uploaded to CDAM', { filename });

  return {
    document_url: raw._links.self.href,
    document_binary_url: raw._links.binary.href,
    document_filename: filename,
    content_type: raw.mimeType || file.mimetype,
    size: raw.size ?? file.size,
  };
}

export async function deleteDocument(documentUrl: string, userToken: string): Promise<void> {
  const cdamUrl = getCdamUrl();
  const documentsIndex = documentUrl.lastIndexOf('/documents/');
  const cdamPath = documentsIndex >= 0 ? `/cases${documentUrl.slice(documentsIndex)}` : documentUrl;

  await http.delete(`${cdamUrl}${cdamPath}`, {
    headers: {
      Authorization: `Bearer ${userToken}`,
    },
  });

  logger.info('Document deleted from CDAM', { documentUrl });
}

export async function getDocumentBinary(
  binaryUrl: string,
  userToken: string
): Promise<{
  stream: NodeJS.ReadableStream;
  contentType: string;
  contentLength?: string;
  contentDisposition?: string;
}> {
  const cdamUrl = getCdamUrl();
  const documentsIndex = binaryUrl.lastIndexOf('/documents');
  const cdamPath = documentsIndex >= 0 ? `/cases${binaryUrl.slice(documentsIndex)}` : binaryUrl;
  const response = await http.get(`${cdamUrl}${cdamPath}`, {
    headers: {
      Authorization: `Bearer ${userToken}`,
    },
    responseType: 'stream',
  });

  const contentType = (response.headers?.['content-type'] as string) || 'application/octet-stream';
  const contentLength = response.headers?.['content-length'] as string | undefined;
  const contentDisposition = response.headers?.['content-disposition'] as string | undefined;

  return {
    stream: response.data as NodeJS.ReadableStream,
    contentType,
    contentLength,
    contentDisposition,
  };
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

export async function getDocumentStream(
  accessToken: string,
  caseReference: string,
  documentId: string
): Promise<DocumentStreamResult> {
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
}
