import { PassThrough } from 'stream';
import config from 'config';

import { HTTPError } from '../../../main/HttpError';

import { http } from '@modules/http';
import { ccdCaseService } from '@services/ccdCaseService';
import { documentService } from '@services/documentService';

jest.mock('@modules/http', () => ({
  http: {
    get: jest.fn(),
  },
}));

jest.mock('@services/ccdCaseService', () => ({
  ccdCaseService: {
    getCaseById: jest.fn(),
  },
}));

describe('documentService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns document stream metadata when document exists', async () => {
    (ccdCaseService.getCaseById as jest.Mock).mockResolvedValue({
      id: '1777570813792018',
      data: {
        allDocuments: [
          {
            id: 'doc-1',
            value: {
              document_filename: 'claim-form.pdf',
              document_binary_url: 'http://dm-store/documents/69a31b98-9de1-49ae-a79c-97d8c521d0f5/binary',
            },
          },
        ],
      },
    });
    const stream = new PassThrough();
    (http.get as jest.Mock).mockResolvedValue({
      headers: {
        'content-type': 'application/pdf',
        'content-length': '1234',
      },
      data: stream,
    });

    const result = await documentService.getDocumentStream('token', '1777570813792018', 'doc-1');

    const cdamBaseUrl = config.get<string>('cdam.url').replace(/\/+$/, '');
    expect(http.get).toHaveBeenCalledWith(
      `${cdamBaseUrl}/cases/documents/69a31b98-9de1-49ae-a79c-97d8c521d0f5/binary`,
      {
      headers: { Authorization: 'Bearer token' },
      responseType: 'stream',
      }
    );
    expect(result.filename).toBe('claim-form.pdf');
    expect(result.contentType).toBe('application/pdf');
    expect(result.contentLength).toBe('1234');
    expect(result.stream).toBe(stream);
  });

  it('throws 404 when document cannot be found', async () => {
    (ccdCaseService.getCaseById as jest.Mock).mockResolvedValue({
      id: '1777570813792018',
      data: {
        allDocuments: [],
      },
    });

    await expect(documentService.getDocumentStream('token', '1777570813792018', 'missing')).rejects.toEqual(
      expect.objectContaining<Partial<HTTPError>>({
        message: 'Document not found',
        status: 404,
      })
    );
  });

  it('throws 404 when document binary URL is missing', async () => {
    (ccdCaseService.getCaseById as jest.Mock).mockResolvedValue({
      id: '1777570813792018',
      data: {
        allDocuments: [
          {
            id: 'doc-1',
            value: {
              document_filename: 'claim-form.pdf',
            },
          },
        ],
      },
    });

    await expect(documentService.getDocumentStream('token', '1777570813792018', 'doc-1')).rejects.toEqual(
      expect.objectContaining<Partial<HTTPError>>({
        message: 'Document not found',
        status: 404,
      })
    );
  });
});
