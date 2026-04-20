/**
 * @jest-environment jsdom
 */

let capturedHooks: Record<string, (...args: unknown[]) => void> = {};

jest.mock('@ministryofjustice/frontend', () => ({
  MultiFileUpload: jest.fn().mockImplementation((_el: unknown, config: { hooks?: Record<string, unknown> }) => {
    capturedHooks = (config?.hooks || {}) as Record<string, (...args: unknown[]) => void>;
    return {};
  }),
}));

jest.mock('@utils/fileExtensionValidation', () => ({
  isBlockedExtension: jest.fn((filename: string) => filename.endsWith('.mp4') || filename.endsWith('.mp3')),
}));

import { initMultiFileUpload } from '../../../../main/assets/js/multi-file-upload';

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
      const summary = getForm().querySelector('.govuk-error-summary');
      expect(summary).not.toBeNull();
      expect(summary!.textContent).toContain('Wrong file type');
    });

    it('throws for files exceeding max size', () => {
      const maxBytes = 1024 * 1024 * 1024;
      expect(() => capturedHooks.entryHook(null, { name: 'big.pdf', size: maxBytes + 1 })).toThrow('too_large');
      const summary = getForm().querySelector('.govuk-error-summary');
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
      const summary = getForm().querySelector<HTMLDivElement>('.govuk-error-summary');
      expect(summary!.hidden).toBe(false);

      expect(() => capturedHooks.entryHook(null, { name: 'doc.pdf', size: 100 })).not.toThrow();
      expect(summary!.hidden).toBe(true);
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
      const value = JSON.parse((inputs[0] as HTMLInputElement).value);
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

      const summary = getForm().querySelector('.govuk-error-summary');
      expect(summary!.textContent).toContain('Server says no');
    });

    it('falls back to wrong type message on parse failure', () => {
      const xhr = { status: 500, response: null, responseText: 'not json' } as unknown as XMLHttpRequest;
      capturedHooks.errorHook(null, {}, xhr);

      const summary = getForm().querySelector('.govuk-error-summary');
      expect(summary!.textContent).toContain('Wrong file type');
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
      const value = JSON.parse((inputs[0] as HTMLInputElement).value);
      expect(value.document_filename).toBe('remaining.pdf');
      expect(value.index).toBe(0);
    });

    it('shows error summary on failed delete', () => {
      const xhr = makeXhr(500, { error: { message: 'fail' } });
      capturedHooks.deleteHook(null, undefined, xhr);

      const summary = getForm().querySelector('.govuk-error-summary');
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
});
