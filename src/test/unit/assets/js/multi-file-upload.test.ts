/**
 * @jest-environment jsdom
 */

import { TextDecoder, TextEncoder } from 'util';

// jsdom strips TextEncoder/TextDecoder from the global scope; real browsers expose them.
if (typeof globalThis.TextEncoder === 'undefined') {
  (globalThis as unknown as { TextEncoder: unknown }).TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
  (globalThis as unknown as { TextDecoder: unknown }).TextDecoder = TextDecoder;
}

let capturedHooks: Record<string, (...args: unknown[]) => void> = {};

jest.mock('@ministryofjustice/frontend', () => ({
  MultiFileUpload: jest.fn().mockImplementation((_el: unknown, config: { hooks?: Record<string, unknown> }) => {
    capturedHooks = (config?.hooks || {}) as Record<string, (...args: unknown[]) => void>;
    return {};
  }),
}));

jest.mock('@utils/fileExtensionValidation', () => ({
  isBlockedExtension: jest.fn((filename: string) => filename.endsWith('.mp4') || filename.endsWith('.mp3')),
  isAllowedExtension: jest.fn(
    (filename: string) =>
      filename.endsWith('.pdf') ||
      filename.endsWith('.doc') ||
      filename.endsWith('.docx') ||
      filename.endsWith('.png') ||
      filename.endsWith('.jpg') ||
      filename.endsWith('.jpeg') ||
      filename.endsWith('.txt') ||
      filename.endsWith('.csv')
  ),
  isMediaExtension: jest.fn(
    (filename: string) =>
      filename.endsWith('.jpg') ||
      filename.endsWith('.jpeg') ||
      filename.endsWith('.png') ||
      filename.endsWith('.bmp') ||
      filename.endsWith('.tif') ||
      filename.endsWith('.tiff')
  ),
}));

import { encodeUploadedDocument, initMultiFileUpload } from '../../../../main/assets/js/multi-file-upload';

import { decodeBase64UrlJson } from '@utils/base64Json';

// Hidden uploadedDocuments[] inputs carry base64url-encoded JSON (WAF-safe).
function decodeHiddenValue(value: string): Record<string, unknown> {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function setupDOM() {
  document.body.innerHTML = `
    <input name="_csrf" value="test-csrf-token" />
    <form>
      <div id="uploaded-documents-container"></div>
      <div id="upload-container"
           data-module="moj-multi-file-upload"
           data-upload-url="/case/123/respond-to-claim/upload-document/upload"
           data-delete-url="/case/123/respond-to-claim/upload-document/delete"
           data-max-file-size-mb="1024"
           data-error-wrong-type="Wrong file type"
           data-error-file-too-large="File too large"
           data-error-delete="Delete failed"
           data-error-summary-title="There is a problem"
           data-delete-button-text="Remove">
      </div>
    </form>
  `;
}

function setupDOMWithMediaAndFilenameCaps() {
  document.body.innerHTML = `
    <input name="_csrf" value="test-csrf-token" />
    <form>
      <div id="uploaded-documents-container"></div>
      <div id="upload-container"
           data-module="moj-multi-file-upload"
           data-upload-url="/case/123/respond-to-claim/upload-document/upload"
           data-delete-url="/case/123/respond-to-claim/upload-document/delete"
           data-max-file-size-mb="1024"
           data-max-media-mb="500"
           data-max-filename-length="255"
           data-error-wrong-type="Wrong file type"
           data-error-file-too-large="File too large"
           data-error-file-too-large-media="Image too large"
           data-error-filename-too-long="Filename too long"
           data-error-delete="Delete failed"
           data-error-summary-title="There is a problem"
           data-delete-button-text="Remove">
      </div>
    </form>
  `;
}

function getForm(): HTMLFormElement {
  return document.querySelector('form')!;
}

function getHiddenContainer(): HTMLElement {
  return document.getElementById('uploaded-documents-container')!;
}

function getContainer(): HTMLElement {
  return document.getElementById('upload-container')!;
}

function makeXhr(status: number, response: unknown): XMLHttpRequest {
  return {
    status,
    response,
    responseText: JSON.stringify(response),
  } as unknown as XMLHttpRequest;
}

describe('multi-file-upload', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    capturedHooks = {};
    jest.clearAllMocks();
  });

  describe('initMultiFileUpload', () => {
    it('does nothing when no upload containers exist', () => {
      const { MultiFileUpload } = require('@ministryofjustice/frontend');
      initMultiFileUpload();
      expect(MultiFileUpload).not.toHaveBeenCalled();
    });

    it('initialises MultiFileUpload when container exists', () => {
      setupDOM();
      const { MultiFileUpload } = require('@ministryofjustice/frontend');
      initMultiFileUpload();
      expect(MultiFileUpload).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.objectContaining({ uploadUrl: '/case/123/respond-to-claim/upload-document/upload' })
      );
    });

    it('does not initialise when upload URL missing', () => {
      document.body.innerHTML =
        '<form><div id="uploaded-documents-container"></div><div data-module="moj-multi-file-upload"></div></form>';
      const { MultiFileUpload } = require('@ministryofjustice/frontend');
      initMultiFileUpload();
      expect(MultiFileUpload).not.toHaveBeenCalled();
    });

    it('does not initialise when form missing', () => {
      document.body.innerHTML =
        '<div id="uploaded-documents-container"></div><div data-module="moj-multi-file-upload" data-upload-url="/upload" data-delete-url="/delete"></div>';
      const { MultiFileUpload } = require('@ministryofjustice/frontend');
      initMultiFileUpload();
      expect(MultiFileUpload).not.toHaveBeenCalled();
    });

    it('does not initialise when hidden container missing', () => {
      document.body.innerHTML =
        '<form><div data-module="moj-multi-file-upload" data-upload-url="/upload" data-delete-url="/delete"></div></form>';
      const { MultiFileUpload } = require('@ministryofjustice/frontend');
      initMultiFileUpload();
      expect(MultiFileUpload).not.toHaveBeenCalled();
    });
  });

  describe('entryHook', () => {
    beforeEach(() => {
      setupDOM();
      initMultiFileUpload();
    });

    it('throws for blocked extensions', () => {
      expect(() => capturedHooks.entryHook(null, { name: 'video.mp4', size: 100 })).toThrow('blocked');
      const summary = document.querySelector('.govuk-error-summary');
      expect(summary).not.toBeNull();
      expect(summary!.textContent).toContain('Wrong file type');
    });

    it('throws for files exceeding max size', () => {
      const maxBytes = 1024 * 1024 * 1024;
      expect(() => capturedHooks.entryHook(null, { name: 'big.pdf', size: maxBytes + 1 })).toThrow('too_large');
      const summary = document.querySelector('.govuk-error-summary');
      expect(summary!.textContent).toContain('File too large');
    });

    it('allows valid files without error', () => {
      expect(() => capturedHooks.entryHook(null, { name: 'doc.pdf', size: 1024 })).not.toThrow();
    });

    it('clears previous error summary', () => {
      try {
        capturedHooks.entryHook(null, { name: 'video.mp4', size: 100 });
      } catch {
        /* expected */
      }
      const summary = document.querySelector<HTMLDivElement>('.govuk-error-summary');
      expect(summary!.hidden).toBe(false);

      expect(() => capturedHooks.entryHook(null, { name: 'doc.pdf', size: 100 })).not.toThrow();
      expect(summary!.hidden).toBe(true);
    });
  });

  describe('entryHook with media + filename caps', () => {
    beforeEach(() => {
      setupDOMWithMediaAndFilenameCaps();
      initMultiFileUpload();
    });

    it('throws filename_too_long for an over-length name', () => {
      const longName = 'a'.repeat(256) + '.pdf';
      expect(() => capturedHooks.entryHook(null, { name: longName, size: 100 })).toThrow('filename_too_long');
      expect(document.querySelector('.govuk-error-summary')!.textContent).toContain('Filename too long');
    });

    it('throws media_too_large for an oversize image', () => {
      const fiveHundredMbPlusOneByte = 500 * 1024 * 1024 + 1;
      expect(() => capturedHooks.entryHook(null, { name: 'big-photo.jpg', size: fiveHundredMbPlusOneByte })).toThrow(
        'media_too_large'
      );
      expect(document.querySelector('.govuk-error-summary')!.textContent).toContain('Image too large');
    });

    it('allows an image just under the media cap', () => {
      const justUnder = 500 * 1024 * 1024 - 1;
      expect(() => capturedHooks.entryHook(null, { name: 'photo.jpg', size: justUnder })).not.toThrow();
    });

    it('uses the document cap for non-image files even when the media cap is configured', () => {
      // 600MB pdf — over the 500MB media cap, under the 1024MB document cap. Should pass.
      const sixHundredMb = 600 * 1024 * 1024;
      expect(() => capturedHooks.entryHook(null, { name: 'big.pdf', size: sixHundredMb })).not.toThrow();
    });

    it('checks filename length before extension allowlist', () => {
      // Overlong .xyz name: precedence puts filename_too_long before invalid_type.
      const longName = 'a'.repeat(256) + '.xyz';
      expect(() => capturedHooks.entryHook(null, { name: longName, size: 100 })).toThrow('filename_too_long');
    });
  });

  describe('exitHook', () => {
    beforeEach(() => {
      setupDOM();
      initMultiFileUpload();
    });

    it('creates hidden input with index and filename', () => {
      const xhr = makeXhr(200, { document: { index: 0, document_filename: 'test.pdf' } });
      capturedHooks.exitHook(null, {}, xhr);

      const inputs = getHiddenContainer().querySelectorAll('input[name="uploadedDocuments[]"]');
      expect(inputs).toHaveLength(1);
      expect((inputs[0] as HTMLInputElement).dataset.documentIndex).toBe('0');
      const value = decodeHiddenValue((inputs[0] as HTMLInputElement).value);
      expect(value.index).toBe(0);
      expect(value.document_filename).toBe('test.pdf');
    });

    it('does not create hidden input when response has no document', () => {
      const xhr = makeXhr(200, { success: true });
      capturedHooks.exitHook(null, {}, xhr);

      const inputs = getHiddenContainer().querySelectorAll('input[name="uploadedDocuments[]"]');
      expect(inputs).toHaveLength(0);
    });

    it('handles malformed response gracefully', () => {
      const xhr = { status: 200, response: null, responseText: 'not json' } as unknown as XMLHttpRequest;
      expect(() => capturedHooks.exitHook(null, {}, xhr)).not.toThrow();
    });

    it('removes error rows after successful upload', () => {
      const container = getContainer();
      const errorRow = document.createElement('div');
      errorRow.className = 'moj-multi-file-upload__row';
      const errorEl = document.createElement('span');
      errorEl.className = 'moj-multi-file-upload__row--error';
      errorRow.appendChild(errorEl);
      container.appendChild(errorRow);

      const xhr = makeXhr(200, { document: { index: 0, document_filename: 'test.pdf' } });
      capturedHooks.exitHook(null, {}, xhr);

      expect(container.querySelector('.moj-multi-file-upload__row--error')).toBeNull();
    });

    it('patches delete button text', () => {
      const container = getContainer();
      const btn = document.createElement('button');
      btn.className = 'moj-multi-file-upload__delete';
      btn.textContent = 'Delete';
      const span = document.createElement('span');
      span.className = 'govuk-visually-hidden';
      span.textContent = 'test.pdf';
      btn.appendChild(span);
      container.appendChild(btn);

      const xhr = makeXhr(200, { document: { index: 0, document_filename: 'test.pdf' } });
      capturedHooks.exitHook(null, {}, xhr);

      expect(btn.textContent).toContain('Remove');
      expect(btn.querySelector('.govuk-visually-hidden')!.textContent).toBe('test.pdf');
    });
  });

  describe('errorHook', () => {
    beforeEach(() => {
      setupDOM();
      initMultiFileUpload();
    });

    it('shows server error message when available', () => {
      const xhr = makeXhr(400, { error: { message: 'Server says no' } });
      capturedHooks.errorHook(null, {}, xhr);

      const summary = document.querySelector('.govuk-error-summary');
      expect(summary!.textContent).toContain('Server says no');
    });

    it('does not show a banner when server response has no structured error message', () => {
      // Per AC: non-AC failures (abort, network, CDAM, 5xx) get the row-level
      // "Upload failed" indicator only — no misleading wrong-type banner.
      const xhr = { status: 500, response: null, responseText: 'not json' } as unknown as XMLHttpRequest;
      capturedHooks.errorHook(null, {}, xhr);

      const summary = document.querySelector('.govuk-error-summary');
      expect(summary).toBeNull();
    });
  });

  describe('deleteHook', () => {
    beforeEach(() => {
      setupDOM();
      initMultiFileUpload();
    });

    it('rebuilds hidden inputs on successful delete', () => {
      const container = getContainer();
      const row = document.createElement('div');
      row.className = 'moj-multi-file-upload__row';
      const filenameEl = document.createElement('span');
      filenameEl.className = 'moj-multi-file-upload__filename';
      filenameEl.textContent = 'remaining.pdf';
      row.appendChild(filenameEl);
      container.appendChild(row);

      const xhr = makeXhr(200, { success: true });
      capturedHooks.deleteHook(null, undefined, xhr);

      const inputs = getHiddenContainer().querySelectorAll('input[name="uploadedDocuments[]"]');
      expect(inputs).toHaveLength(1);
      const value = decodeHiddenValue((inputs[0] as HTMLInputElement).value);
      expect(value.document_filename).toBe('remaining.pdf');
      expect(value.index).toBe(0);
    });

    it('rebuilds hidden inputs for server-rendered rows without __filename', () => {
      const container = getContainer();
      const row = document.createElement('div');
      row.className = 'moj-multi-file-upload__row';
      const message = document.createElement('div');
      message.className = 'moj-multi-file-upload__message';
      message.textContent = 'remaining.pdf';
      row.appendChild(message);
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'moj-multi-file-upload__delete';
      deleteBtn.value = 'ccd-doc-id';
      deleteBtn.textContent = 'Remove ';
      const hiddenSpan = document.createElement('span');
      hiddenSpan.className = 'govuk-visually-hidden';
      hiddenSpan.textContent = 'remaining.pdf';
      deleteBtn.appendChild(hiddenSpan);
      row.appendChild(deleteBtn);
      container.appendChild(row);

      const xhr = makeXhr(200, { success: true });
      capturedHooks.deleteHook(null, undefined, xhr);

      const inputs = getHiddenContainer().querySelectorAll('input[name="uploadedDocuments[]"]');
      expect(inputs).toHaveLength(1);
      const value = decodeHiddenValue((inputs[0] as HTMLInputElement).value);
      expect(value.document_filename).toBe('remaining.pdf');
      expect(value.id).toBe('ccd-doc-id');
      expect(value.index).toBeUndefined();
    });

    it('rebuilds hidden inputs for success rows using visually-hidden filename', () => {
      const container = getContainer();
      const row = document.createElement('div');
      row.className = 'moj-multi-file-upload__row';
      const message = document.createElement('div');
      message.className = 'moj-multi-file-upload__message';
      message.innerHTML = '<span class="moj-multi-file-upload__success"><svg></svg>uploaded.pdf</span>';
      row.appendChild(message);
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'moj-multi-file-upload__delete';
      deleteBtn.value = 'ccd-doc-id-2';
      deleteBtn.textContent = 'Remove ';
      const hiddenSpan = document.createElement('span');
      hiddenSpan.className = 'govuk-visually-hidden';
      hiddenSpan.textContent = 'uploaded.pdf';
      deleteBtn.appendChild(hiddenSpan);
      row.appendChild(deleteBtn);
      container.appendChild(row);

      const xhr = makeXhr(200, { success: true });
      capturedHooks.deleteHook(null, undefined, xhr);

      const inputs = getHiddenContainer().querySelectorAll('input[name="uploadedDocuments[]"]');
      expect(inputs).toHaveLength(1);
      const value = decodeHiddenValue((inputs[0] as HTMLInputElement).value);
      expect(value.document_filename).toBe('uploaded.pdf');
      expect(value.id).toBe('ccd-doc-id-2');
    });

    it('shows error summary on failed delete', () => {
      const xhr = makeXhr(500, { error: { message: 'fail' } });
      capturedHooks.deleteHook(null, undefined, xhr);

      const summary = document.querySelector('.govuk-error-summary');
      expect(summary!.textContent).toContain('Delete failed');
    });

    it('handles malformed success response gracefully', () => {
      const xhr = { status: 200, response: null, responseText: 'not json' } as unknown as XMLHttpRequest;
      expect(() => capturedHooks.deleteHook(null, undefined, xhr)).not.toThrow();
    });
  });

  describe('form submit prevention', () => {
    it('prevents submit when error summary visible', () => {
      setupDOM();
      initMultiFileUpload();

      try {
        capturedHooks.entryHook(null, { name: 'video.mp3', size: 100 });
      } catch {
        /* expected */
      }

      const form = getForm();
      const event = new Event('submit', { cancelable: true });
      form.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
    });

    it('allows submit when no error visible', () => {
      setupDOM();
      initMultiFileUpload();

      const form = getForm();
      const event = new Event('submit', { cancelable: true });
      form.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
    });
  });

  describe('CSRF interceptor', () => {
    it('installs XHR interceptor on init', () => {
      const originalOpen = XMLHttpRequest.prototype.open;
      setupDOM();
      initMultiFileUpload();
      expect(XMLHttpRequest.prototype.open).not.toBe(originalOpen);
    });
  });

  describe('duplicate label accessibility fix', () => {
    function setupDropzoneDOM() {
      document.body.innerHTML = `
        <form>
          <div id="uploaded-documents-container"></div>
          <div id="upload-container"
               data-module="moj-multi-file-upload"
               data-upload-url="/upload"
               data-delete-url="/delete">
            <div class="moj-multi-file-upload__dropzone">
              <input id="documents" class="moj-multi-file-upload__input" type="file" />
              <label class="govuk-button govuk-button--secondary" for="documents">Choose file</label>
            </div>
          </div>
        </form>
      `;
    }

    function getChooseFilesButton(): HTMLButtonElement {
      return document.querySelector(
        '.moj-multi-file-upload__dropzone button.govuk-button--secondary'
      ) as HTMLButtonElement;
    }

    it('replaces the MoJ duplicate label with a button to fix WAVE orphaned label', () => {
      setupDropzoneDOM();
      const input = document.getElementById('documents') as HTMLInputElement;
      const clickSpy = jest.spyOn(input, 'click').mockImplementation(() => {});

      initMultiFileUpload();

      // Original <label> is gone; a real <button> takes its place
      expect(document.querySelector('.moj-multi-file-upload__dropzone label.govuk-button--secondary')).toBeNull();

      const button = getChooseFilesButton();
      expect(button).toBeInstanceOf(HTMLButtonElement);
      expect(button.type).toBe('button');
      expect(button.textContent).toBe('Choose file');

      button.click();
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    // MOJ clones the <input> after every successful upload (multi-file-upload.mjs:102-107).
    // The click handler must late-bind to the live input via the class selector, otherwise
    // the "Choose file" control goes dead after the first upload.
    it('clicking the button targets the live input after MOJ clones it', () => {
      setupDropzoneDOM();
      const original = document.getElementById('documents') as HTMLInputElement;
      const originalSpy = jest.spyOn(original, 'click').mockImplementation(() => {});

      initMultiFileUpload();

      const cloned = original.cloneNode(true) as HTMLInputElement;
      const clonedSpy = jest.spyOn(cloned, 'click').mockImplementation(() => {});
      original.replaceWith(cloned);

      getChooseFilesButton().click();

      expect(clonedSpy).toHaveBeenCalledTimes(1);
      expect(originalSpy).not.toHaveBeenCalled();
    });
  });

  describe('error summary dropzone highlight', () => {
    function setupErrorHighlightDOM() {
      document.body.innerHTML = `
        <div class="govuk-grid-column-two-thirds">
          <div class="govuk-error-summary" role="alert">
            <div class="govuk-error-summary__body">
              <ul class="govuk-list govuk-error-summary__list">
                <li><a href="#documents">Select a document to upload</a></li>
              </ul>
            </div>
          </div>
        </div>
        <form>
          <div id="uploaded-documents-container"></div>
          <div class="govuk-form-group govuk-form-group--error">
            <div id="upload-container"
                 data-module="moj-multi-file-upload"
                 data-upload-url="/upload"
                 data-delete-url="/delete">
              <div class="moj-multi-file-upload__dropzone">
                <input id="documents" class="moj-multi-file-upload__input" type="file" />
              </div>
            </div>
          </div>
        </form>
      `;
    }

    function getDropzone(): HTMLElement {
      return document.querySelector('.moj-multi-file-upload__dropzone')!;
    }

    it('highlights dropzone when error-summary link is clicked', () => {
      setupErrorHighlightDOM();
      initMultiFileUpload();

      const dropzone = getDropzone();
      expect(dropzone.classList.contains('moj-multi-file-upload__dropzone--error-summary-target')).toBe(false);

      document.querySelector<HTMLAnchorElement>('.govuk-error-summary a[href="#documents"]')!.click();

      expect(dropzone.classList.contains('moj-multi-file-upload__dropzone--error-summary-target')).toBe(true);
    });

    it('highlights dropzone on file input focus when form group is in error', () => {
      setupErrorHighlightDOM();
      initMultiFileUpload();

      const dropzone = getDropzone();
      const fileInput = document.getElementById('documents') as HTMLInputElement;

      fileInput.focus();

      expect(dropzone.classList.contains('moj-multi-file-upload__dropzone--error-summary-target')).toBe(true);
    });

    it('clears dropzone highlight on file input blur', () => {
      setupErrorHighlightDOM();
      initMultiFileUpload();

      const dropzone = getDropzone();
      const fileInput = document.getElementById('documents') as HTMLInputElement;

      fileInput.focus();
      fileInput.blur();

      expect(dropzone.classList.contains('moj-multi-file-upload__dropzone--error-summary-target')).toBe(false);
    });

    it('clears dropzone highlight when inline field error is cleared', () => {
      setupErrorHighlightDOM();
      initMultiFileUpload();

      const dropzone = getDropzone();
      document.querySelector<HTMLAnchorElement>('.govuk-error-summary a[href="#documents"]')!.click();
      expect(dropzone.classList.contains('moj-multi-file-upload__dropzone--error-summary-target')).toBe(true);

      try {
        capturedHooks.entryHook(null, { name: 'doc.pdf', size: 1024 });
      } catch {
        /* not expected */
      }

      expect(dropzone.classList.contains('moj-multi-file-upload__dropzone--error-summary-target')).toBe(false);
    });
  });
});

// The client encoder and the server decoder are separate implementations; this guards
// against the two base64url paths drifting apart (HDPI-5770).
describe('encodeUploadedDocument round-trips through the server decoder', () => {
  it('decodes back to the original document', () => {
    const doc = { index: 0, id: 'abc', document_filename: 'rentArrears.pdf' };
    expect(decodeBase64UrlJson(encodeUploadedDocument(doc))).toEqual(doc);
  });

  it('survives non-ASCII filenames', () => {
    const doc = { index: 1, document_filename: 'café-déjà-vu.pdf' };
    expect(decodeBase64UrlJson(encodeUploadedDocument(doc))).toEqual(doc);
  });

  it('produces only base64url characters', () => {
    expect(encodeUploadedDocument({ document_filename: 'x.pdf' })).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
