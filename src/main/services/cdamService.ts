import config from 'config';
import FormData from 'form-data';

import { CASE_TYPE, CLASSIFICATION, JURISDICTION } from '../constants';

import { http } from '@modules/http';
import { Logger } from '@modules/logger';
import type { CdamDocument, CdamRawDocument, CdamUploadResponse } from '@services/documentUpload.interface';

const logger = Logger.getLogger('cdamService');

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
): Promise<{ stream: NodeJS.ReadableStream; contentType: string }> {
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

  return { stream: response.data as NodeJS.ReadableStream, contentType };
}
