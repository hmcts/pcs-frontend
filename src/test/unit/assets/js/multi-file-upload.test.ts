/**
 * @jest-environment jsdom
 */

jest.mock('@ministryofjustice/frontend', () => ({
  MultiFileUpload: jest.fn(),
}));

jest.mock('@utils/fileExtensionValidation', () => ({
  isBlockedExtension: jest.fn((filename: string) => filename.endsWith('.mp4')),
}));

import { initMultiFileUpload } from '../../../../main/assets/js/multi-file-upload';

describe('multi-file-upload', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('initMultiFileUpload', () => {
    it('does nothing when no upload containers exist', () => {
      const { MultiFileUpload } = require('@ministryofjustice/frontend');
      initMultiFileUpload();
      expect(MultiFileUpload).not.toHaveBeenCalled();
    });

    it('initialises MultiFileUpload when container exists', () => {
      document.body.innerHTML = `
        <form>
          <div id="uploaded-documents-container"></div>
          <div data-module="moj-multi-file-upload"
               data-upload-url="/upload"
               data-delete-url="/delete"
               data-max-file-size-mb="1024"
               data-error-wrong-type="Wrong type"
               data-error-file-too-large="Too large"
               data-error-delete="Delete failed"
               data-error-summary-title="There is a problem"
               data-delete-button-text="Remove">
          </div>
        </form>
        <input name="_csrf" value="csrf-token" />
      `;

      const { MultiFileUpload } = require('@ministryofjustice/frontend');
      initMultiFileUpload();
      expect(MultiFileUpload).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.objectContaining({
          uploadUrl: '/upload',
          deleteUrl: '/delete',
        })
      );
    });

    it('does not initialise when upload URL is missing', () => {
      document.body.innerHTML = `
        <form>
          <div id="uploaded-documents-container"></div>
          <div data-module="moj-multi-file-upload"></div>
        </form>
      `;

      const { MultiFileUpload } = require('@ministryofjustice/frontend');
      initMultiFileUpload();
      expect(MultiFileUpload).not.toHaveBeenCalled();
    });

    it('does not initialise when form is missing', () => {
      document.body.innerHTML = `
        <div id="uploaded-documents-container"></div>
        <div data-module="moj-multi-file-upload"
             data-upload-url="/upload"
             data-delete-url="/delete">
        </div>
      `;

      const { MultiFileUpload } = require('@ministryofjustice/frontend');
      initMultiFileUpload();
      expect(MultiFileUpload).not.toHaveBeenCalled();
    });

    it('does not initialise when hidden container is missing', () => {
      document.body.innerHTML = `
        <form>
          <div data-module="moj-multi-file-upload"
               data-upload-url="/upload"
               data-delete-url="/delete">
          </div>
        </form>
      `;

      const { MultiFileUpload } = require('@ministryofjustice/frontend');
      initMultiFileUpload();
      expect(MultiFileUpload).not.toHaveBeenCalled();
    });
  });
});
