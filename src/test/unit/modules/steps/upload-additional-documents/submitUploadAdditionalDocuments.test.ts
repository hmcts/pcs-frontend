jest.mock('config', () => ({
  get: jest.fn((key: string) => {
    if (key === 'ccd.url') {
      return 'http://ccd.test';
    }
    return undefined;
  }),
}));

jest.mock('../../../../../main/modules/http', () => ({
  http: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

import { http } from '../../../../../main/modules/http';
import { submitUploadAdditionalDocuments } from '../../../../../main/modules/steps/upload-additional-documents/submitUploadAdditionalDocuments';

describe('submitUploadAdditionalDocuments', () => {
  const mockGet = http.get as jest.Mock;
  const mockPost = http.post as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue({ data: { token: 'event-token' } });
    mockPost.mockResolvedValue({ data: {} });
  });

  it('calls CCD START then SUBMIT for uploadDocuments', async () => {
    const data = { uploadedAdditionalDocuments: [] };

    await submitUploadAdditionalDocuments('access-token', '1234567890123456', data);

    expect(mockGet).toHaveBeenCalledWith(
      'http://ccd.test/cases/1234567890123456/event-triggers/uploadDocuments',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
      })
    );

    expect(mockPost).toHaveBeenCalledWith(
      'http://ccd.test/cases/1234567890123456/events',
      {
        data,
        event: {
          id: 'uploadDocuments',
          summary: 'Citizen uploadDocuments summary',
          description: 'Citizen uploadDocuments description',
        },
        event_token: 'event-token',
        ignore_warning: false,
      },
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
      })
    );
  });
});
