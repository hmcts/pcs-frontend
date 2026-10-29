import { AxiosError } from 'axios';
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
): Promise<{
  stream: NodeJS.ReadableStream;
  contentType: string;
  contentLength?: string;
  contentDisposition?: string;
}> {
  const cdamUrl = getCdamUrl();
  const documentsIndex = binaryUrl.lastIndexOf('/documents');
  const cdamPath = documentsIndex >= 0 ? `/cases${binaryUrl.slice(documentsIndex)}` : binaryUrl;
  const requestUrl = `${cdamUrl}${cdamPath}`;

  logger.debug('Fetching document binary from CDAM', {
    requestUrl,
    cdamPath,
    sourceBinaryUrl: binaryUrl,
  });

  let response;
  try {
    response = await http.get(requestUrl, {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
      responseType: 'stream',
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    if (axiosError.response?.status === 403) {
      logger.warn('CDAM returned 403 Forbidden, attempting fallback to direct DM-Store binaryUrl with user token', {
        requestUrl,
        binaryUrl,
      });
      try {
        response = await http.get(binaryUrl, {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
          responseType: 'stream',
        });
        logger.info('Fallback document binary fetch from DM-Store succeeded with user token');
      } catch (userFallbackError) {
        logger.warn('DM-Store with user token failed, attempting S2S service fallback', {
          binaryUrl,
          userError: (userFallbackError as AxiosError).message,
        });
        try {
          response = await http.get(binaryUrl, {
            headers: {
              'user-id': 'pcs-frontend-service',
              'user-roles': 'caseworker-civil,caseworker-civil-solicitor,pui-case-manager',
            },
            responseType: 'stream',
          });
          logger.info('S2S service fallback fetch from DM-Store succeeded');
        } catch (s2sFallbackError) {
          logger.error('All document binary fetch attempts failed (CDAM, DM-Store user token, DM-Store S2S service)', {
            requestUrl,
            binaryUrl,
            cdamError: axiosError.message,
            userFallbackError: (userFallbackError as AxiosError).message,
            s2sFallbackError: (s2sFallbackError as AxiosError).message,
          });
          throw error;
        }
      }
    } else {
      logger.error('CDAM document binary fetch failed', {
        requestUrl,
        cdamPath,
        sourceBinaryUrl: binaryUrl,
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        errorMessage: axiosError.message,
      });
      throw error;
    }
  }

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
