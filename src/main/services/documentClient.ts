import { Logger } from '@hmcts/nodejs-logging';
import { AxiosResponse } from 'axios';
import config from 'config';

import { http } from '../modules/http';

const logger = Logger.getLogger('documentClient');

export function documentIdExtractor(documentBinaryUrl: string): string | undefined {
  if (!documentBinaryUrl) {
    return undefined;
  }

  // Extract UUID from URL pattern: /documents/{uuid}/binary
  const regex = /\/([0-9a-f-]{36})\/binary$/i;
  const match = regex.exec(documentBinaryUrl);

  return match ? match[1] : undefined;
}

/**
 * Response object containing file metadata and binary data
 */
export class FileResponse {
  contentType: string;
  fileName: string;
  data: Buffer;

  constructor(contentType: string, fileName: string, data: Buffer) {
    this.contentType = contentType;
    this.fileName = fileName;
    this.data = data;
  }
}

/**
 * Client for retrieving documents from PCS API
 */
export class DocumentClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.get('api.url');
  }

  /**
   * Retrieve document from PCS API
   * @param documentId - The document UUID extracted from document_binary_url
   * @param accessToken - User's authentication token
   * @returns FileResponse containing file metadata and binary data
   */
  async retrieveDocument(documentId: string, accessToken: string): Promise<FileResponse> {
    try {
      logger.info(`[documentClient] Retrieving document ${documentId} from ${this.baseUrl}`);

      const response: AxiosResponse<Buffer> = await http.get(
        `${this.baseUrl}/case/document/downloadDocument/${documentId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          responseType: 'arraybuffer',
          responseEncoding: 'binary',
        }
      );

      // Extract content type and filename from response headers
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const fileName = response.headers['original-file-name'] || `document-${documentId}`;

      logger.info(`[documentClient] Successfully retrieved document: ${fileName} (${contentType})`);

      return new FileResponse(contentType, fileName, response.data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[documentClient] Error retrieving document ${documentId}: ${errorMessage}`);
      throw error;
    }
  }
}

// Export singleton instance
export const documentClient = new DocumentClient();
