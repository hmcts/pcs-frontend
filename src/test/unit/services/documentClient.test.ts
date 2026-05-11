import config from 'config';

import { http } from '@modules/http';
import { documentClient, extractDocumentId } from '@services/documentClient';

jest.mock('config');
jest.mock('@modules/http');

const mockGet = http.get as jest.Mock;

const pcsApiHost = 'https://pcs-api.test.com';

(config.get as jest.Mock).mockImplementation(key => {
  if (key === 'api.url') {
    return pcsApiHost;
  }
});

describe('documentClient', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('extractDocumentId', () => {
    it('should return undefined document ID for undefined URL', async () => {
      const result = await extractDocumentId(undefined as unknown as string);

      expect(result).toBeUndefined();
    });

    it('should return undefined document ID for unexpected URL pattern', async () => {
      const result = await extractDocumentId('https://host/not/a/valid/pattern/1234');

      expect(result).toBeUndefined();
    });

    it('should return document ID for expected URL pattern', async () => {
      const expectedDocumentId = 'bf112cdf-76d7-4d15-bb92-cd7c3483a7ef';
      const result = await extractDocumentId(`https://host/some/path/${expectedDocumentId}`);

      expect(result).toEqual(expectedDocumentId);
    });
  });

  describe('documentClient', () => {
    it('should call pcs-api endpoint', async () => {
      const documentId = 'bf112cdf-76d7-4d15-bb92-cd7c3483a7ef';
      const accessToken = 'token';
      const expectedContentType = 'some content type';
      const expectedData = Buffer.from('test content');

      mockGet.mockResolvedValue({
        headers: {
          'content-type': expectedContentType,
          'content-disposition': 'inline; filename="safe-filename.pdf"; filename*=UTF-8\'\'encoded-filename.pdf',
        },
        data: expectedData,
      });

      await documentClient.retrieveDocument(documentId, accessToken);

      expect(mockGet).toHaveBeenCalledWith(
        `${pcsApiHost}/case/document/downloadDocument/bf112cdf-76d7-4d15-bb92-cd7c3483a7ef`,
        {
          headers: { Authorization: 'Bearer token' },
          responseEncoding: 'binary',
          responseType: 'arraybuffer',
        }
      );
    });

    it('should return document details', async () => {
      const documentId = 'bf112cdf-76d7-4d15-bb92-cd7c3483a7ef';
      const accessToken = 'token';
      const expectedContentType = 'some content type';
      const expectedData = Buffer.from('test content');

      mockGet.mockResolvedValue({
        headers: {
          'content-type': expectedContentType,
          'content-disposition': 'inline; filename="safe-filename.pdf"; filename*=UTF-8\'\'encoded-filename.pdf',
        },
        data: expectedData,
      });

      const fileResponse = await documentClient.retrieveDocument(documentId, accessToken);

      expect(fileResponse.contentType).toEqual(expectedContentType);
      expect(fileResponse.fileName).toEqual('encoded-filename.pdf');
    });
  });
});
