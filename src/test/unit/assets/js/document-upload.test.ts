import { initDocumentUpload } from '../../../../main/assets/js/document-upload';

const flushPromises = () => new Promise<void>(resolve => setTimeout(resolve, 0));

const setFetch = (value: unknown) => {
  Object.defineProperty(globalThis, 'fetch', {
    value,
    writable: true,
    configurable: true,
  });
};

describe('initDocumentUpload', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
    setFetch(undefined);
  });

  const buildUploadPage = () => `
    <div id="upload-stage">
      <form id="uploadForm">
        <input type="file" id="upload" name="upload" />
        <button type="button" id="uploadButton">Upload</button>
      </form>
    </div>
    <div id="continue-stage" style="display: none;">
      <span id="document-name"></span>
      <span id="document-id"></span>
      <form id="submitForm">
        <input type="hidden" name="caseReference" value="1234567890" />
        <button type="submit" id="continueButton">Continue</button>
      </form>
    </div>
    <div id="upload-error" style="display: none;">
      <span id="error-message"></span>
    </div>
  `;

  it('does nothing when upload elements not present', () => {
    expect(() => initDocumentUpload()).not.toThrow();
  });

  it('successfully uploads document to CDAM (Stage 1)', async () => {
    document.body.innerHTML = buildUploadPage();

    const mockResponse = {
      success: true,
      documents: [
        {
          originalDocumentName: 'test.pdf',
          _links: {
            self: { href: 'http://dm-store/documents/doc-123' },
            binary: { href: 'http://dm-store/documents/doc-123/binary' },
          },
        },
      ],
      document: {
        originalDocumentName: 'test.pdf',
      },
      documentId: 'doc-123',
    };

    setFetch(
      jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })
    );

    initDocumentUpload();

    const uploadButton = document.getElementById('uploadButton') as HTMLButtonElement;
    const uploadStage = document.getElementById('upload-stage') as HTMLDivElement;
    const continueStage = document.getElementById('continue-stage') as HTMLDivElement;

    uploadButton.click();
    await flushPromises();

    expect(global.fetch).toHaveBeenCalledWith('/uploadDocPoc/page2/uploadDocument', expect.any(Object));
    expect(uploadStage.style.display).toBe('none');
    expect(continueStage.style.display).toBe('block');
  });

  it('handles upload error (Stage 1)', async () => {
    document.body.innerHTML = buildUploadPage();

    const mockResponse = {
      success: false,
      message: 'Upload failed',
    };

    setFetch(
      jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })
    );

    initDocumentUpload();

    const uploadButton = document.getElementById('uploadButton') as HTMLButtonElement;
    const uploadError = document.getElementById('upload-error') as HTMLDivElement;

    uploadButton.click();
    await flushPromises();

    expect(uploadError.style.display).toBe('block');
  });

  it('successfully submits document to CCD (Stage 2)', async () => {
    document.body.innerHTML = buildUploadPage();

    // First upload
    const uploadResponse = {
      success: true,
      documents: [
        {
          originalDocumentName: 'test.pdf',
          _links: {
            self: { href: 'http://dm-store/documents/doc-123' },
            binary: { href: 'http://dm-store/documents/doc-123/binary' },
          },
        },
      ],
      document: { originalDocumentName: 'test.pdf' },
      documentId: 'doc-123',
    };

    const submitResponse = {
      success: true,
      caseReference: '1234567890',
    };

    setFetch(
      jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => uploadResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => submitResponse,
        })
    );

    // Mock alert
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation();

    initDocumentUpload();

    const uploadButton = document.getElementById('uploadButton') as HTMLButtonElement;
    uploadButton.click();
    await flushPromises();

    const submitForm = document.getElementById('submitForm') as HTMLFormElement;
    submitForm.dispatchEvent(new Event('submit'));
    await flushPromises();

    expect(global.fetch).toHaveBeenCalledWith('/uploadDocPoc/page2/submitDocument', expect.any(Object));
    expect(alertSpy).toHaveBeenCalledWith('Documents successfully associated with case 1234567890');

    alertSpy.mockRestore();
  });

  it('handles submit error (Stage 2)', async () => {
    document.body.innerHTML = buildUploadPage();

    // First upload successfully
    const uploadResponse = {
      success: true,
      documents: [
        {
          originalDocumentName: 'test.pdf',
          _links: {
            self: { href: 'http://dm-store/documents/doc-123' },
            binary: { href: 'http://dm-store/documents/doc-123/binary' },
          },
        },
      ],
      document: { originalDocumentName: 'test.pdf' },
      documentId: 'doc-123',
    };

    const submitResponse = {
      success: false,
      message: 'CCD submission failed',
    };

    setFetch(
      jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => uploadResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => submitResponse,
        })
    );

    initDocumentUpload();

    const uploadButton = document.getElementById('uploadButton') as HTMLButtonElement;
    uploadButton.click();
    await flushPromises();

    const submitForm = document.getElementById('submitForm') as HTMLFormElement;
    const uploadError = document.getElementById('upload-error') as HTMLDivElement;

    submitForm.dispatchEvent(new Event('submit'));
    await flushPromises();

    expect(uploadError.style.display).toBe('block');
  });
});
