import { Logger } from '@hmcts/nodejs-logging';
import config from 'config';
import type { UploadedFile } from 'express-fileupload';
import FormData from 'form-data';

import type { DocumentManagementFile } from '../../types/global';
import { http } from '../modules/http';

const logger = Logger.getLogger('cdamService');

export class CDAMService {
  private readonly cdamUrl: string;
  private readonly jurisdictionId: string;
  private readonly caseTypeId: string;

  constructor() {
    this.cdamUrl = config.get<string>('cdam.url');
    this.jurisdictionId = config.get<string>('jurisdiction');
    this.caseTypeId = config.get<string>('caseType');
  }

  /**
   * Upload documents to CDAM
   * @param files - Files to upload (from express-fileupload)
   * @param userId - User ID from OIDC token (uid field)
   * @param accessToken - User's access token from OIDC
   * @returns Array of uploaded document metadata (raw from CDAM)
   */
  async uploadDocuments(
    files: UploadedFile | UploadedFile[],
    userId: string,
    accessToken: string
  ): Promise<DocumentManagementFile[]> {
    try {
      logger.info('Uploading documents to CDAM');

      // create FormData with CDAM parameters
      const formData = new FormData();
      formData.append('classification', 'PUBLIC');
      formData.append('caseTypeId', this.caseTypeId);
      formData.append('jurisdictionId', this.jurisdictionId);

      // add files to FormData
      const fileArray = Array.isArray(files) ? files : [files];
      fileArray.forEach(file => {
        formData.append('files', file.data, {
          filename: file.name,
          contentType: file.mimetype,
        });
      });

      // send request to CDAM
      const response = await http.post(`${this.cdamUrl}/cases/documents`, formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${accessToken}`,
          'user-id': userId,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      // log the raw response for debugging
      logger.info('CDAM Raw Response:', JSON.stringify(response.data, null, 2));

      // return whatever CDAM sent back
      const documents = response.data || response || [];
      const documentsArray = Array.isArray(documents) ? documents : [documents];

      logger.info(`Successfully uploaded ${documentsArray.length} documents to CDAM`);
      return documentsArray;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Type assertion for axios error response structure
      const errorResponse =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response: { status?: number; data?: unknown } }).response
          : undefined;

      logger.error('CDAM upload error:', {
        message: errorMessage,
        status: errorResponse?.status,
        data: errorResponse?.data,
      });
      throw new Error(`Failed to upload documents to CDAM: ${errorMessage}`);
    }
  }
}

export const cdamService = new CDAMService();
